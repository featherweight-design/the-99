"""The pieces the benchmark runs: synthetic phone-photo scenes, the two corner detectors, the
perspective warp, and the embedders. Research only.

Model contracts, as published:
  dhvazquez pose (mtg_4kp_s_r4b): 640x640 RGB in [0,1], no mean/std; outputs per query
      (scores logit, boxes, keypoints TL,TR,BR,BL normalised [0,1]); take the top-score query.
  dhvazquez embedder: a warped card, 448x320 (HxW), ImageNet mean/std, 256-d, L2-normalised.
  HanClinto fastweb-single 1.39: 384x384 RGB, ImageNet-normalised; outputs 8 corner floats
      TL,TR,BR,BL normalised [0,1], a constant presence logit, and `sharpness` (mean SimCC
      peak) as the card-present gate. Whether the 384 input is stretched or letterboxed is not
      stated on the model card; `calibrate_hc` measures both and the benchmark uses the winner.
  DINOv2-small (onnx-community export of facebook/dinov2-small): ImageNet mean/std; we feed
      the warped card at 224x168 (HxW, multiples of the 14px patch) and use the CLS token.
"""
from __future__ import annotations

import math

import cv2
import numpy as np
import onnxruntime as ort

from common import WEIGHTS

MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
EMB_H, EMB_W = 448, 320
DINO_H, DINO_W = 224, 168
SCENE_W, SCENE_H = 720, 960
YY, XX = np.mgrid[0:SCENE_H, 0:SCENE_W].astype(np.float32)


def session(path, threads=1):
    so = ort.SessionOptions()
    so.intra_op_num_threads = threads
    so.inter_op_num_threads = 1
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])


# ---------------------------------------------------------------- images


def read_rgb(path) -> np.ndarray:
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None:
        raise FileNotFoundError(path)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def card_alpha(h, w) -> np.ndarray:
    """Rounded-corner mask: Scryfall's JPEGs carry a matte outside the corner radius."""
    a = np.zeros((h, w), np.uint8)
    r = int(round(0.035 * w))
    cv2.rectangle(a, (r, 0), (w - 1 - r, h - 1), 255, -1)
    cv2.rectangle(a, (0, r), (w - 1, h - 1 - r), 255, -1)
    for cx, cy in ((r, r), (w - 1 - r, r), (r, h - 1 - r), (w - 1 - r, h - 1 - r)):
        cv2.circle(a, (cx, cy), r, 255, -1)
    return a


# ---------------------------------------------------------------- scenes


def background(rng: np.random.Generator, clutter: np.ndarray | None) -> np.ndarray:
    kind = rng.integers(0, 4)
    H, W = SCENE_H, SCENE_W
    if kind == 0:  # plain table colour with sensor-ish noise
        c = rng.integers(20, 235, 3)
        bg = np.ones((H, W, 3), np.float32) * c
        bg += rng.normal(0, 6, (H, W, 3))
    elif kind == 1:  # wood-like grain
        c = np.array([rng.integers(90, 170), rng.integers(55, 110), rng.integers(25, 70)], np.float32)
        y = np.arange(H)[:, None]
        x = np.arange(W)[None, :]
        f = rng.uniform(0.02, 0.06)
        grain = np.sin(y * f + 3 * np.sin(x * 0.01 + rng.uniform(0, 6))) * 18
        bg = np.dstack([c[i] + grain for i in range(3)]).astype(np.float32)
        bg += rng.normal(0, 4, (H, W, 3))
    elif kind == 2:  # dark playmat with a soft vignette
        c = rng.integers(10, 60, 3)
        yy, xx = np.mgrid[0:H, 0:W]
        v = 1 - 0.5 * (((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
        bg = np.dstack([c[i] * v * 1.6 for i in range(3)]).astype(np.float32)
    else:  # clutter: another card's art, blurred, as a busy playmat
        if clutter is None:
            return background(rng, None)
        bg = cv2.resize(clutter, (W, H)).astype(np.float32)
        bg = cv2.GaussianBlur(bg, (0, 0), rng.uniform(3, 8))
    return np.clip(bg, 0, 255)


def place(card, rng, persp: float, rot_deg: float, scale=(0.62, 0.8)):
    """Corners of the card in the scene: upright, centred-ish, then tilted and rotated."""
    h, w = card.shape[:2]
    ch = SCENE_H * rng.uniform(*scale)
    cw = ch * w / h
    cx = SCENE_W / 2 + rng.uniform(-0.06, 0.06) * SCENE_W
    cy = SCENE_H / 2 + rng.uniform(-0.05, 0.05) * SCENE_H
    base = np.array([[-cw / 2, -ch / 2], [cw / 2, -ch / 2], [cw / 2, ch / 2], [-cw / 2, ch / 2]], np.float32)
    # perspective: pull one pair of edges in (a tilt toward/away from the camera) plus jitter
    t = rng.uniform(-persp, persp)
    s = rng.uniform(-persp, persp)
    base[0, 0] *= 1 - t; base[1, 0] *= 1 - t; base[2, 0] *= 1 + t; base[3, 0] *= 1 + t
    base[0, 1] *= 1 - s; base[3, 1] *= 1 - s; base[1, 1] *= 1 + s; base[2, 1] *= 1 + s
    base += rng.normal(0, persp * 0.25 * cw, base.shape).astype(np.float32)
    a = math.radians(rng.uniform(-rot_deg, rot_deg))
    R = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]], np.float32)
    pts = base @ R.T + np.array([cx, cy], np.float32)
    return pts


def composite(card, corners, bg):
    h, w = card.shape[:2]
    src = np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32)
    M = cv2.getPerspectiveTransform(src, corners.astype(np.float32))
    warped = cv2.warpPerspective(card, M, (SCENE_W, SCENE_H), flags=cv2.INTER_AREA)
    alpha = cv2.warpPerspective(card_alpha(h, w), M, (SCENE_W, SCENE_H), flags=cv2.INTER_LINEAR)
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    # a little contact shadow
    shadow = cv2.GaussianBlur(a[..., 0], (0, 0), 6)[..., None]
    bg = bg * (1 - 0.35 * np.roll(np.roll(shadow, 6, 0), 4, 1))
    return warped.astype(np.float32) * a + bg * (1 - a), a[..., 0]


def card_mask_region(alpha, rng, frac):
    ys, xs = np.nonzero(alpha > 0.5)
    i = rng.integers(0, len(ys))
    return xs[i], ys[i]


def aug_blur(img, rng, sev):
    k = [0, 5, 11, 19][sev]
    if k:
        ang = rng.uniform(0, 180)
        ker = np.zeros((k, k), np.float32)
        ker[k // 2, :] = 1
        Rm = cv2.getRotationMatrix2D((k / 2 - 0.5, k / 2 - 0.5), ang, 1)
        ker = cv2.warpAffine(ker, Rm, (k, k))
        ker /= ker.sum()
        img = cv2.filter2D(img, -1, ker)
    sig = [0, 1.0, 2.0, 3.5][sev]
    return cv2.GaussianBlur(img, (0, 0), sig) if sig else img


def aug_low_light(img, rng, sev):
    gain = [1, 0.55, 0.38, 0.25][sev]
    noise = [0, 7, 13, 20][sev]
    cast = np.array([1.0, 0.93, 0.8], np.float32)  # warm indoor bulb
    img = 255 * (img / 255.0) ** 1.15 * gain * cast
    img = img + rng.normal(0, noise, img.shape)
    # chroma noise, which a phone sensor shows in the dark
    img = img + cv2.resize(rng.normal(0, noise * 0.6, (SCENE_H // 8, SCENE_W // 8, 3)).astype(np.float32),
                           (SCENE_W, SCENE_H))
    return img


def aug_glare(img, alpha, rng, sev, card_w):
    n = [0, 1, 2, 3][sev]
    rad = [0, 0.06, 0.1, 0.15][sev] * card_w
    yy, xx = YY, XX
    for _ in range(n):
        x, y = card_mask_region(alpha, rng, 0)
        rx, ry = rad * rng.uniform(0.7, 1.6), rad * rng.uniform(0.5, 1.0)
        a = rng.uniform(0, math.pi)
        dx, dy = xx - x, yy - y
        u = (dx * math.cos(a) + dy * math.sin(a)) / rx
        v = (-dx * math.sin(a) + dy * math.cos(a)) / ry
        spot = np.exp(-(u * u + v * v) * 1.5)
        spot = np.clip(spot * 1.6, 0, 1)[..., None]  # saturated core, soft falloff
        img = img * (1 - spot) + 255 * spot
    return img


def aug_sleeve(img, alpha, rng, sev, card_w):
    strength = [0, 0.15, 0.25, 0.38][sev]
    yy, xx = YY, XX
    a = rng.uniform(0, math.pi)
    d = xx * math.cos(a) + yy * math.sin(a)
    c = rng.uniform(d.min() + 0.3 * (d.max() - d.min()), d.min() + 0.7 * (d.max() - d.min()))
    band = np.exp(-((d - c) / (0.35 * card_w)) ** 2)[..., None] * alpha[..., None]
    gray = img.mean(axis=2, keepdims=True)
    img = img * (1 - 0.3 * strength) + gray * 0.3 * strength  # sleeves wash colour out a little
    img = img * (1 - strength * band) + 235 * strength * band
    return cv2.GaussianBlur(img, (0, 0), 0.6 + sev * 0.3)


def aug_occlusion(img, corners, rng, sev):
    frac = [0, 0.05, 0.12, 0.2][sev]
    # a thumb: a skin-toned ellipse entering from one long edge of the card
    e = rng.integers(0, 4)
    p0, p1 = corners[e], corners[(e + 1) % 4]
    t = rng.uniform(0.25, 0.75)
    edge_pt = p0 + (p1 - p0) * t
    centre = corners.mean(axis=0)
    inward = (centre - edge_pt) / (np.linalg.norm(centre - edge_pt) + 1e-6)
    area = cv2.contourArea(corners.astype(np.float32)) * frac
    ry = math.sqrt(area / math.pi / 0.6)
    rx = ry * 0.6
    c = edge_pt + inward * ry * 0.35
    ang = math.degrees(math.atan2(inward[1], inward[0]))
    skin = np.array([rng.uniform(150, 230), rng.uniform(105, 170), rng.uniform(80, 140)])
    over = img.copy()
    cv2.ellipse(over, (int(c[0]), int(c[1])), (int(ry * 1.8), int(rx)), ang, 0, 360, skin.tolist(), -1)
    m = np.zeros(img.shape[:2], np.float32)
    cv2.ellipse(m, (int(c[0]), int(c[1])), (int(ry * 1.8), int(rx)), ang, 0, 360, 1.0, -1)
    m2 = cv2.GaussianBlur(m, (0, 0), 2)
    shade = cv2.GaussianBlur(m2, (0, 0), 12)[..., None]
    m = m2[..., None]
    return over * m + img * (1 - m) * (1 - 0.25 * shade * (1 - m))


def border_colour(card):
    """Mean colour of the card's outer ring (its printed border, or the art at a borderless edge)."""
    h, w = card.shape[:2]
    a = card_alpha(h, w) > 0
    ring = np.zeros((h, w), bool)
    b = max(3, int(0.03 * w))
    ring[:b, :] = ring[-b:, :] = True
    ring[:, :b] = ring[:, -b:] = True
    return card[ring & a].reshape(-1, 3).mean(axis=0)


def low_contrast_background(card, rng, sev):
    """A table nearly the colour of the card's own border: a black-bordered card on a dark table,
    a white-bordered or pale borderless card on a light one. The gap shrinks with severity."""
    c = border_colour(card).astype(np.float32)
    lum = float(c.mean())
    gap = [0, 40, 20, 7][sev]
    sign = 1.0 if lum < 128 else -1.0
    base = np.clip(c + sign * gap, 0, 255)
    yy, xx = YY, XX
    grad = ((xx / SCENE_W - 0.5) * rng.uniform(-8, 8) + (yy / SCENE_H - 0.5) * rng.uniform(-8, 8))[..., None]
    tex = cv2.GaussianBlur(rng.normal(0, 6, (SCENE_H, SCENE_W, 1)).astype(np.float32), (0, 0), 1.5)
    tex = tex[..., None] if tex.ndim == 2 else tex
    return np.clip(base[None, None, :] + grad + tex + rng.normal(0, 2, (SCENE_H, SCENE_W, 3)), 0, 255)


def aug_foil(img, alpha, rng, sev, card_w):
    """A traditional foil: a rainbow interference sheen across the card plus bright specular
    streaks where the light catches it, both stronger with severity."""
    k = [0, 0.15, 0.28, 0.42][sev]
    yy, xx = YY, XX
    a = rng.uniform(0, math.pi)
    d = xx * math.cos(a) + yy * math.sin(a)
    period = card_w * rng.uniform(0.5, 1.1)
    hue = ((d / period + 0.15 * np.sin(yy / card_w * 5 + rng.uniform(0, 6))) % 1.0) * 179
    hsv = np.dstack([hue, np.full_like(hue, 200), np.full_like(hue, 255)]).astype(np.uint8)
    rainbow = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB).astype(np.float32)
    m = alpha[..., None] * k
    lum = img.mean(axis=2, keepdims=True) / 255.0
    img = img * (1 - m) + (rainbow * (0.45 + 0.55 * lum)) * m  # sheen rides on the print
    for _ in range(sev):
        b = rng.uniform(0, math.pi)
        e = xx * math.cos(b) + yy * math.sin(b)
        c0 = rng.uniform(e[alpha > 0.5].min(), e[alpha > 0.5].max())
        streak = np.exp(-((e - c0) / (card_w * rng.uniform(0.03, 0.08))) ** 2)
        streak = (streak * rng.uniform(0.5, 0.9) * alpha)[..., None]
        img = img * (1 - streak) + 255 * streak
    return img


def jpeg(img, q):
    ok, buf = cv2.imencode(".jpg", cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR),
                           [cv2.IMWRITE_JPEG_QUALITY, int(q)])
    return cv2.cvtColor(cv2.imdecode(buf, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)


CONDITIONS = ["clean", "perspective", "blur", "low_light", "glare", "sleeve", "occlusion", "low_contrast",
              "foil", "realistic"]


def render(card, cond, sev, seed, clutter=None):
    """One synthetic phone photo of `card`. Returns (rgb uint8 scene, true corners TL,TR,BR,BL)."""
    rng = np.random.default_rng(seed)
    bg = background(rng, clutter)
    if cond == "low_contrast":
        bg = low_contrast_background(card, rng, sev)
    persp, rot = 0.02, 3.0  # a hand-held, nearly flat shot
    if cond == "perspective":
        persp, rot = [0.02, 0.06, 0.11, 0.17][sev], [3, 8, 15, 22][sev]
    if cond == "realistic":
        persp, rot = rng.uniform(0.03, 0.09), rng.uniform(4, 12)
    corners = place(card, rng, persp, rot)
    img, alpha = composite(card, corners, bg)
    card_w = float(np.linalg.norm(corners[1] - corners[0]))
    if cond == "blur":
        img = aug_blur(img, rng, sev)
    elif cond == "low_light":
        img = aug_low_light(img, rng, sev)
    elif cond == "glare":
        img = aug_glare(img, alpha, rng, sev, card_w)
    elif cond == "sleeve":
        img = aug_sleeve(img, alpha, rng, sev, card_w)
    elif cond == "occlusion":
        img = aug_occlusion(img, corners, rng, sev)
    elif cond == "foil":
        img = aug_foil(img, alpha, rng, sev, card_w)
    elif cond == "realistic":
        # a plausible bad-but-normal phone shot: mild everything, one surface reflection
        if rng.random() < 0.5:
            img = aug_sleeve(img, alpha, rng, int(rng.integers(1, 3)), card_w)
        else:
            img = aug_glare(img, alpha, rng, 1, card_w)
        if rng.random() < 0.4:
            img = aug_occlusion(img, corners, rng, 1)
        img = aug_low_light(img, rng, int(rng.integers(0, 2)) if rng.random() < 0.7 else 2)
        img = aug_blur(img, rng, 1)
    q = rng.uniform(60, 85) if cond == "realistic" else 88
    return jpeg(img, q), corners


# ---------------------------------------------------------------- geometry


def sort_corners(pts):
    pts = np.asarray(pts, np.float32)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], np.float32)


def warp(img, corners, h=EMB_H, w=EMB_W):
    src = sort_corners(corners)
    dst = np.array([[0, 0], [w, 0], [w, h], [0, h]], np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_LINEAR)


def quad_iou(a, b):
    """IoU of two quads by rasterising both: a self-intersecting predicted quad is measured as
    drawn (cv2.intersectConvexConvex assumes convexity and read IoU > 1 on 3 of the first run's
    46,712 scenes; report.py counts those as 0)."""
    ma = np.zeros((SCENE_H, SCENE_W), np.uint8)
    mb = np.zeros((SCENE_H, SCENE_W), np.uint8)
    cv2.fillPoly(ma, [np.round(sort_corners(a)).astype(np.int32)], 1)
    cv2.fillPoly(mb, [np.round(sort_corners(b)).astype(np.int32)], 1)
    union = int((ma | mb).sum())
    return float((ma & mb).sum() / union) if union else 0.0


# ---------------------------------------------------------------- models


class DhvPose:
    def __init__(self, threads=1):
        self.s = session(WEIGHTS / "dhv_pose" / "mtg_4kp_s_r4b.onnx", threads)

    def __call__(self, img):
        H, W = img.shape[:2]
        x = cv2.resize(img, (640, 640), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0
        x = x.transpose(2, 0, 1)[None]
        scores, boxes, kps = self.s.run(None, {"image": x})
        sc = 1 / (1 + np.exp(-scores[0]))
        i = int(np.argmax(sc))
        pts = kps[0, i] * np.array([W, H], np.float32)
        return pts, float(sc[i])


class HcDetector:
    def __init__(self, threads=1, mode="stretch"):
        self.s = session(WEIGHTS / "hc_det" / "fastweb-single-1.39.renamed.onnx", threads)
        self.mode = mode

    def __call__(self, img):
        H, W = img.shape[:2]
        if self.mode == "stretch":
            x = cv2.resize(img, (384, 384), interpolation=cv2.INTER_AREA)
            sx, sy, ox, oy = W, H, 0, 0
        else:  # letterbox to a square, centred
            S = max(H, W)
            pad = np.zeros((S, S, 3), np.uint8)
            ox, oy = (S - W) // 2, (S - H) // 2
            pad[oy:oy + H, ox:ox + W] = img
            x = cv2.resize(pad, (384, 384), interpolation=cv2.INTER_AREA)
            sx = sy = S
        x = ((x.astype(np.float32) / 255.0 - MEAN) / STD).transpose(2, 0, 1)[None]
        corners, presence, sharp = self.s.run(None, {"image": x})
        pts = corners[0].reshape(4, 2) * np.array([sx, sy], np.float32) - np.array([ox, oy], np.float32)
        return pts, float(np.asarray(sharp).ravel()[0])


class DhvEmbedder:
    dim = 256

    def __init__(self, variant="fp32", threads=1):
        self.s = session(WEIGHTS / "dhv_embed" / f"mtg_embed_{variant}.onnx", threads)
        self.dtype = np.float16 if variant == "fp16" else np.float32

    def prep(self, card_rgb):
        x = cv2.resize(card_rgb, (EMB_W, EMB_H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        return ((x - MEAN) / STD).transpose(2, 0, 1)

    def __call__(self, cards):
        x = np.stack([self.prep(c) for c in cards]).astype(self.dtype)
        z = self.s.run(None, {"input": x})[0].astype(np.float32)
        return z / np.linalg.norm(z, axis=1, keepdims=True)


class DinoEmbedder:
    dim = 384

    def __init__(self, threads=1):
        self.s = session(WEIGHTS / "dinov2" / "model.onnx", threads)

    def prep(self, card_rgb):
        x = cv2.resize(card_rgb, (DINO_W, DINO_H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        return ((x - MEAN) / STD).transpose(2, 0, 1)

    def __call__(self, cards):
        x = np.stack([self.prep(c) for c in cards]).astype(np.float32)
        z = self.s.run(None, {"pixel_values": x})[0][:, 0, :]
        return z / np.linalg.norm(z, axis=1, keepdims=True)
