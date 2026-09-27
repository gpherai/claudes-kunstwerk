# Sanātana — The Eternal Way

An immersive, scroll-driven journey through **Sanātana Dharma**, in twelve chapters and a return.
**There are no images and no audio files.** Every pixel and every sound is generated live in the browser by code.

> *Sanātana*: eternal, ever-renewed. *Dharma*: that which upholds.
> The site ends where it began: scroll past the end and the cycle starts again.

## The chapters

| # | Chapter | What you see and hear | How it is made |
|---|---------|-----------------------|----------------|
| 1 | **Om** | ॐ formed from 262,144 grains of golden sand; your cursor stirs it | GPGPU particle simulation (float textures), glyph sampled from the Tiro Devanagari font |
| 2 | **Nāda** | The syllables A-U-M as Chladni figures, with a synthesized choir singing along as you scroll | Real plate physics: grains descend to the nodal lines of a vibrating field; formant voice synthesis |
| 3 | **Nāsadīya Sūkta** | The Ṛg Veda's Hymn of Creation (10.129): dark waters, a golden cosmic egg, a spiral galaxy | Same particle universe, morphing between force fields over a domain-warped nebula |
| 4 | **Kāla** | A living cosmic clock from the blink of an eye (nimeṣa) to Brahmā's lifetime (311 trillion years), with a live Kali Yuga counter | Canvas 2D; every hand shows where we are *now* in that cycle |
| 5 | **Pañcāṅga** | Today's tithi, nakṣatra, yoga, karaṇa and vāra, the nine grahas and 1,300 real stars on a sidereal wheel | `astronomy-engine`, Lahiri ayanāṃśa, Yale Bright Star Catalogue |
| 6 | **Naṭarāja** | Śiva's cosmic dance as a bronze relief in a ring of living fire, one act at a time | 2D signed distance fields in three depth layers, baked once, then lit per frame (rim light from the fire, speculars, embers) |
| 7 | **Śrī Yantra** | The nine interlocking triangles draw themselves from the bindu outward; the nine enclosures light up one by one | Levenberg–Marquardt solves all 31 triple intersections to machine precision, in your browser |
| 8 | **Kolam** | A new rice-flour kolam drawn for you on a dawn-lit threshold; ask for one single unbroken line | Mirror curves (Gerdes/Jablan) with D4 symmetry and a loop-joining search |
| 9 | **Mandira** | A Nāgara temple rises from the Vāstu-puruṣa-maṇḍala at dusk: 1 + 4 + 16 + 64 spires, a fractal in stone | Procedural three.js geometry: lofted stepped plan, ribbed āmalaka, instanced recursion, shadows |
| 10 | **Ekaṃ Sat** | "Truth is one; the wise call it by many names": twelve deities orbit one light | Hand-coded SVG emblems (trident, discus, vīṇā, peacock feather…) and bilingual texts |
| 11 | **Gītā** | Spin a Konark-style chariot wheel to receive one of eighteen verses | SVG physics with inertia and snapping |
| 12 | **Pūrṇam** | An endless lattice of mirrored jewels, each reflecting all the others; your cursor becomes one of them | Ray-marched spheres with three reflection bounces |

**Sound** (optional): a tanpura drone (Pa-Sa-Sa-Sa) rendered with additive synthesis and a travelling *jawari* formant, a formant-synthesized Om choir, a temple bell and a ḍamaru drum from modal synthesis, and a generated convolution reverb.

Bilingual: **English / Nederlands** (it follows your browser language; switch at the top right).

## Tech

Vite 8 · TypeScript 7 · three.js r186 · GSAP 3.15 · Lenis 1.3 · astronomy-engine 2.1 · Web Audio · WebGL2.
One WebGL context crossfades the chapter scenes through a hand-written HDR pipeline: mip-chain bloom, ACES tone mapping, chromatic aberration, vignette and grain. Resolution adapts to your device's frame rate.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
Enable it once under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Credits

- Śrī Yantra starting geometry: the rigid "Type III" construction as published in [`@vibzart/sri-yantra`](https://www.npmjs.com/package/@vibzart/sri-yantra) (MIT, after TeXample.net). The triple points are then solved exactly in the browser.
- Star positions: Yale Bright Star Catalogue (public domain), via `brettonw/YaleBrightStarCatalog`.
- Fonts: Cormorant Garamond, EB Garamond, Tiro Devanagari Sanskrit, JetBrains Mono (SIL OFL, via Fontsource).
- Translations of the Sanskrit are free renderings.
- `public/og.jpg` is only the social-media preview, a screenshot of the site itself. It is not shown on the page.

Sanātana Dharma is a vast, living and plural tradition. This is one small, loving attempt to show some of its beauty, not a complete or authoritative account.

---

### Nederlands

Een meeslepende scrollreis door Sanātana Dharma in twaalf hoofdstukken, **volledig uit code opgebouwd**: geen afbeeldingen, geen audiobestanden. Zandfysica voor Om, Chladni-figuren voor A-U-M met een gesynthetiseerd koor, het Scheppingslied, een levende kosmische klok, de live berekende pañcāṅga, Naṭarāja als bronzen reliëf in een vuurring, een numeriek opgeloste Śrī Yantra, kolams als spiegelkrommen, een fractale tempel, de vele gezichten van het Ene, het wiel van de Gītā en een oneindig net van spiegelende juwelen. Scroll voorbij het einde en de cyclus begint opnieuw.

Made with ❤ by Claude (Anthropic).
