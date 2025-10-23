# faça chover — Machine-Learned Collage (V1)

**Live demo:** [https://naydino.github.io/faca-chover-ML-collage/](https://naydino.github.io/faca-chover-ML-collage/)  
**Artist:** [@naydino](https://github.com/naydino)

---

### 🌧️ Concept

> *12 am.  
> Just got back from machine learning class. Head spinning.  
> Heart ache. Trying to fill in the gaps of what it’s missing.  
> Cutouts — collage of the things I’ve found.  
> Compositions to merge the gaps between my physical world and my imaginary.*

**faça chover** (Portuguese for *make it rain*) is an ongoing interactive collage experiment that merges scanned fragments of the artist’s physical collages with a live, pre-trained neural network.  
Each image is “seen” by the MobileNet model, which classifies it into poetic misinterpretations like *bookshop*, *hoopskirt*, or *doormat*.  
These guesses are released as drifting “word stickers,” creating an evolving visual poem powered by machine perception and human emotion.

---

### 🧠 What It Does

- Loads your own scanned PNG cutouts (with transparency).  
- The **ml5.js MobileNet classifier** “looks” at one cutout every few seconds.  
- Its **label** and **confidence** values control:
  - size, spin, opacity, drift, and tint of the collage pieces  
  - floating **text stickers** (the “machine poem”) that fade over time  
- The composition never repeats — every run is a new rain.

---

### 🕹️ How to Use

| Action | Key / Button | Description |
|--------|---------------|-------------|
| **Freeze** | `F` or the Freeze button | Pause motion and classification |
| **Save** | `S` or Save button | Export current collage as PNG |
| **Add PNG** | Upload button | Add your own transparent cutouts |
| **Click / tap** | — | “Glue” a burst of pieces |
| **H** | — | Toggle HUD info (debug view) |

💡 Works on desktop and mobile (but may run slowly on iOS due to heavy layering and transparency).

---

### 🧩 Built With

- [**p5.js**](https://p5js.org/) — creative coding & rendering  
- [**ml5.js**](https://ml5js.org/) — friendly machine learning library  
- [**TensorFlow.js**](https://www.tensorflow.org/js) — powering MobileNet under the hood

---

### 🧪 Technical Notes

- The model classifies one cutout every ~2 seconds (`classifyEveryMs = 2200`).
- Confidence values modulate how strong or subtle each piece behaves.  
- Uploads are automatically downscaled (max side ≈ 900 px) to prevent crashes.  
- On mobile, the sketch seeds initial pieces automatically to avoid a blank start.
- Paper-grain overlay adds subtle texture for print-like depth.

---

### 🧭 Roadmap (V2 ideas)

- 🎨 Custom category training via **KNN** (user-taught figure / text / object classes)  
- 🪶 “Simple” mode for mobile (lower density, fewer layers)  
- 🖼️ Poster export with frozen metadata (date, label log, color theme)  
- 🕰️ Time-based generative variations — night / day / emotional tone  
- 🌈 Live camera input
