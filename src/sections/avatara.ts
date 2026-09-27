import type { Section } from '../core/section';
import type { Frame } from '../core/stage';
import { audio } from '../core/audio';
import { i18n } from '../core/i18n';
import { clamp, toDeva } from '../core/util';

/* ─────────────────────────────────────────────────────────────
   Daśāvatāra — the ten descents of Viṣṇu as a procession you
   scroll through. Each emblem is drawn in code; beneath them runs
   the ribbon that so many have compared to evolution: water,
   amphibian, beast, man-beast, dwarf, human… and one still to come.
   ───────────────────────────────────────────────────────────── */

type L = { en: string; nl: string };
interface Avatar { name: string; deva: string; yuga: string; stage: L; text: L; icon: string }

const G = '#f0c46a';
const S = `stroke="${G}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const S1 = `stroke="${G}" stroke-width="1" stroke-linecap="round" fill="none"`;
const waves = (y: number) => `<path d="M-42 ${y} q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" stroke="#5ab0ff" stroke-width="1.4" fill="none" opacity="0.8"/>`;

const ICONS: Record<string, string> = {
  matsya: `<path d="M-30 0 C-15 -19 12 -19 24 -2 C12 15 -15 17 -30 0Z" fill="${G}" fill-opacity="0.12" ${S}/><path d="M24 -2 L39 -15 L34 -1 L39 14 Z" fill="${G}" fill-opacity="0.2" ${S}/>` +
    `<circle cx="-19" cy="-3" r="2" fill="${G}"/>` + [-8, 0, 8].map((x) => `<path d="M${x} -9 q5 9 0 18" ${S1}/>`).join('') +
    `<path d="M-4 -15 q6 -10 14 -6" ${S1}/><path d="M-2 13 q6 8 12 4" ${S1}/>` + waves(28) + waves(36),
  kurma: `<path d="M-10 -10 L0 -38 L10 -10" fill="${G}" fill-opacity="0.12" ${S}/><path d="M-13 -22 q7 5 13 -1 t13 1" stroke="#7fd18a" stroke-width="1.4" fill="none"/>` +
    `<path d="M-28 10 C-26 -16 26 -16 28 10 Z" fill="${G}" fill-opacity="0.15" ${S}/><path d="M-14 -8 L-6 2 L6 2 L14 -8 M-6 2 L-8 10 M6 2 L8 10 M-20 0 L-6 2 M20 0 L6 2" ${S1}/>` +
    `<path d="M28 6 q6 -2 9 -7" ${S}/><circle cx="38" cy="-3" r="4" ${S}/><path d="M-22 10 l-4 6 M-8 10 l-2 6 M10 10 l2 6 M22 10 l4 6" ${S}/>` + waves(26) + waves(34),
  varaha: `<circle cx="6" cy="-18" r="15" fill="#2f6fdc" fill-opacity="0.3" ${S}/><path d="M-2 -26 q6 -4 10 2 q4 6 -3 8 q-7 2 -7 -10Z M10 -12 q6 -2 8 4 q-4 4 -8 -4Z" fill="#6fcf8a" opacity="0.7"/>` +
    `<path d="M-30 22 C-14 20 2 10 4 -3" stroke="${G}" stroke-width="4.5" stroke-linecap="round" fill="none"/><path d="M-30 22 C-14 20 2 10 4 -3" stroke="#fff4d6" stroke-width="1.2" fill="none" opacity="0.6"/>` + waves(30) + waves(38),
  narasimha: `<path d="M-30 -36 L-18 -36 L-17 36 L-31 36 Z M18 -36 L30 -36 L31 36 L17 36 Z" fill="${G}" fill-opacity="0.12" ${S}/><path d="M-18 -36 l4 12 l-4 10 l4 12 l-3 12 l4 12 l-4 14 M18 -36 l-4 12 l4 10 l-4 12 l3 12 l-4 12 l4 14" ${S1}/>` +
    Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `<path d="M${Math.cos(a) * 11} ${-4 + Math.sin(a) * 11} L${Math.cos(a + 0.17) * 20} ${-4 + Math.sin(a + 0.17) * 20}" stroke="#ff9a3c" stroke-width="2" stroke-linecap="round"/>`; }).join('') +
    `<circle cx="0" cy="-4" r="10" fill="#1a0d06" ${S}/><path d="M-5 -7 l3 1 M5 -7 l-3 1 M-4 1 q4 3 8 0" ${S1}/><path d="M-2 -1 l2 2 l2 -2" ${S1}/>`,
  vamana: `<path d="M-24 -12 Q-2 -36 20 -12 Z" fill="${G}" fill-opacity="0.15" ${S}/><path d="M-2 -24 L-2 26 M-24 -12 L-2 -24 L20 -12 M-13 -12 L-2 -24 L9 -12" ${S1}/><path d="M-2 26 q0 5 -5 5" ${S}/>` +
    [[16, 30, 0.8], [26, 8, 1], [34, -16, 1.2]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(18)"><ellipse rx="3" ry="5.5" fill="${G}" fill-opacity="0.4" ${S1}/>${[-2.4, -0.8, 0.8, 2.4].map((tx) => `<circle cx="${tx}" cy="-7.4" r="0.9" fill="${G}"/>`).join('')}</g>`).join(''),
  parashurama: `<path d="M-22 32 L14 -24" stroke="${G}" stroke-width="3.5" stroke-linecap="round"/><path d="M-22 32 L14 -24" stroke="#fff4d6" stroke-width="0.8" opacity="0.5"/>` +
    `<path d="M6 -34 C30 -34 36 -12 24 -2 L12 -19 Z" fill="${G}" fill-opacity="0.3" ${S}/><path d="M13 -30 C26 -28 29 -15 23 -8" ${S1}/><path d="M-16 23 l6 4 M-12 17 l6 4" ${S1}/>`,
  rama: `<path d="M-10 -34 Q20 0 -10 34" stroke="${G}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-10 -34 L-10 34" ${S1}/>` +
    `<path d="M-26 0 L28 0" ${S}/><path d="M29 0 L20 -5 L20 5 Z" fill="${G}"/><path d="M-26 0 l-5 -5 M-26 0 l-5 5 M-21 0 l-5 -5 M-21 0 l-5 5" ${S1}/>`,
  krishna: `<path d="M-30 22 L26 -14" stroke="#d9b36a" stroke-width="4.5" stroke-linecap="round"/>` + [-12, -4, 4, 12].map((t) => `<circle cx="${t}" cy="${4 - (t + 2) * 0.64}" r="1.2" fill="#2a1a0a"/>`).join('') +
    `<path d="M12 -8 Q18 -24 30 -34" stroke="#d9b36a" stroke-width="1.2" fill="none"/>` + Array.from({ length: 12 }, (_, i) => { const t = i / 11, x = 12 + 18 * t, y = -8 - 26 * t; return `<path d="M${x} ${y} q-8 -2 -10 -8 M${x} ${y} q8 0 10 -6" stroke="#2fa37a" stroke-width="0.7" fill="none"/>`; }).join('') +
    `<ellipse cx="29" cy="-30" rx="7" ry="9" fill="#1d8f6a"/><ellipse cx="29" cy="-29.5" rx="5" ry="6.6" fill="#d9a441"/><ellipse cx="29" cy="-29" rx="3.6" ry="5" fill="#2f6fdc"/><ellipse cx="29" cy="-28.5" rx="2" ry="3" fill="#0b1640"/>`,
  buddha: `<path d="M0 26 C-28 6 -26 -20 0 -24 C26 -20 28 6 0 26 Z" fill="#6fcf8a" fill-opacity="0.18" stroke="#8fe0a0" stroke-width="1.8"/><path d="M0 26 L0 38" stroke="#8fe0a0" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M0 -24 L0 26" stroke="#8fe0a0" stroke-width="1"/>` + [-16, -8, 0, 8].map((y) => `<path d="M0 ${y} q-10 -4 -16 -10 M0 ${y} q10 -4 16 -10" stroke="#8fe0a0" stroke-width="0.7" fill="none"/>`).join(''),
  kalki: `<path d="M-30 30 A30 30 0 0 1 30 30" fill="#ff8a2a" fill-opacity="0.15" stroke="#ff8a2a" stroke-width="1.2"/>` + Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i + 0.5) * (Math.PI / 9); return `<path d="M${Math.cos(a) * 34} ${30 + Math.sin(a) * 34} L${Math.cos(a) * 42} ${30 + Math.sin(a) * 42}" stroke="#ff8a2a" stroke-width="1" opacity="0.7"/>`; }).join('') +
    `<path d="M0 -38 L4.5 -30 L4.5 14 L-4.5 14 L-4.5 -30 Z" fill="#f6efe2" fill-opacity="0.25" stroke="#f6efe2" stroke-width="1.6"/><path d="M0 -32 L0 12" stroke="#f6efe2" stroke-width="0.6"/>` +
    `<path d="M-14 14 L14 14" stroke="${G}" stroke-width="3" stroke-linecap="round"/><path d="M0 16 L0 28" stroke="${G}" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="31" r="3" fill="${G}"/>`,
};

const AVATARS: Avatar[] = [
  { name: 'Matsya', deva: 'मत्स्य', yuga: 'Satya', icon: 'matsya', stage: { en: 'water', nl: 'water' },
    text: { en: 'The fish who warned Manu of the great flood and towed his boat — with the seeds of all life and the seven sages — to safety.', nl: 'De vis die Manu waarschuwde voor de grote vloed en zijn boot — met de zaden van al het leven en de zeven wijzen — in veiligheid trok.' } },
  { name: 'Kūrma', deva: 'कूर्म', yuga: 'Satya', icon: 'kurma', stage: { en: 'water and land', nl: 'water en land' },
    text: { en: 'The tortoise who carried Mount Mandara on his back while gods and demons churned the ocean of milk for the nectar of immortality.', nl: 'De schildpad die de berg Mandara op zijn rug droeg terwijl goden en demonen de melkoceaan karnden voor de nectar van onsterfelijkheid.' } },
  { name: 'Varāha', deva: 'वराह', yuga: 'Satya', icon: 'varaha', stage: { en: 'land', nl: 'land' },
    text: { en: 'The boar who dived into the cosmic waters and lifted the Earth, the goddess Bhūdevī, back up on his tusk.', nl: 'Het everzwijn dat in de kosmische wateren dook en de Aarde, de godin Bhūdevī, op zijn slagtand weer omhoog tilde.' } },
  { name: 'Narasiṃha', deva: 'नरसिंह', yuga: 'Satya', icon: 'narasimha', stage: { en: 'half human', nl: 'half mens' },
    text: { en: 'Neither man nor beast, neither day nor night, neither inside nor out: at dusk, on a threshold, the man-lion burst from a pillar to protect the child Prahlāda.', nl: 'Mens noch dier, dag noch nacht, binnen noch buiten: in de schemering, op een drempel, brak de mens-leeuw uit een zuil om het kind Prahlāda te beschermen.' } },
  { name: 'Vāmana', deva: 'वामन', yuga: 'Tretā', icon: 'vamana', stage: { en: 'small human', nl: 'kleine mens' },
    text: { en: 'A dwarf asked King Bali for three steps of land — then grew until two strides covered earth and sky, and set the third on Bali’s head.', nl: 'Een dwerg vroeg koning Bali om drie passen land — en groeide tot twee passen aarde en hemel bedekten; de derde zette hij op Bali’s hoofd.' } },
  { name: 'Paraśurāma', deva: 'परशुराम', yuga: 'Tretā', icon: 'parashurama', stage: { en: 'human with a tool', nl: 'mens met gereedschap' },
    text: { en: 'Rāma with the axe: a brahmin warrior who, the stories say, cleared the earth of tyrant kings twenty-one times.', nl: 'Rāma met de bijl: een brahmaanse krijger die volgens de verhalen de aarde eenentwintig keer van tirannieke koningen bevrijdde.' } },
  { name: 'Rāma', deva: 'राम', yuga: 'Tretā', icon: 'rama', stage: { en: 'the ideal human', nl: 'de ideale mens' },
    text: { en: 'Prince of Ayodhyā and hero of the Rāmāyaṇa: dharma lived out as son, husband and king.', nl: 'Prins van Ayodhyā en held van de Rāmāyaṇa: dharma geleefd als zoon, echtgenoot en koning.' } },
  { name: 'Kṛṣṇa', deva: 'कृष्ण', yuga: 'Dvāpara', icon: 'krishna', stage: { en: 'the divine in human form', nl: 'het goddelijke in mensengedaante' },
    text: { en: 'The flute-player of Vṛndāvana and teacher of the Bhagavad Gītā. (Some lists count his brother Balarāma here, and Kṛṣṇa as the source of all avatāras.)', nl: 'De fluitspeler van Vṛndāvana en leraar van de Bhagavad Gītā. (Sommige lijsten tellen hier zijn broer Balarāma, en Kṛṣṇa als de bron van alle avatāra’s.)' } },
  { name: 'Buddha', deva: 'बुद्ध', yuga: 'Kali', icon: 'buddha', stage: { en: 'the awakened one', nl: 'de ontwaakte' },
    text: { en: 'In many medieval lists, the Buddha — who taught compassion and the end of suffering — is the ninth descent.', nl: 'In veel middeleeuwse lijsten is de Boeddha — die mededogen en het einde van het lijden onderwees — de negende nederdaling.' } },
  { name: 'Kalki', deva: 'कल्कि', yuga: 'Kali', icon: 'kalki', stage: { en: 'still to come', nl: 'nog te komen' },
    text: { en: 'Still to come. At the end of this Kali Yuga, on a white horse and with a blazing sword, Kalki will close the age of darkness — and a new Satya Yuga will dawn.', nl: 'Nog te komen. Aan het einde van deze Kali Yuga zal Kalki, op een wit paard en met een vlammend zwaard, het tijdperk van duisternis afsluiten — en breekt een nieuwe Satya Yuga aan.' } },
];

export class AvataraSection implements Section {
  chapter = 'avatara';
  private track!: HTMLElement;
  private cards: HTMLElement[] = [];
  private marker!: HTMLElement;
  private stageLabel!: HTMLElement;
  private active = -1;
  private pos = 0;
  private head!: HTMLElement;

  init() {
    this.track = document.querySelector('[data-avatara]')!;
    this.marker = document.querySelector('.avatara__marker')!;
    this.stageLabel = document.querySelector('.avatara__stage')!;
    this.head = document.querySelector('.avatara__head')!;
    this.render();
    i18n.onChange(() => this.render());
  }

  private render() {
    const P = (x: L) => i18n.pick(x);
    this.track.innerHTML = AVATARS.map((a, i) => `
      <article class="avatar" style="--i:${i}">
        <div class="avatar__emblem"><svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="47" fill="none" stroke="${G}" stroke-opacity="0.25"/><circle r="43" fill="#0a0a14" fill-opacity="0.6" stroke="${G}" stroke-opacity="0.5" stroke-width="0.6"/>${ICONS[a.icon]}</svg></div>
        <p class="avatar__num deva">${toDeva(i + 1)}</p>
        <h3 class="avatar__name">${a.name} <span class="deva" lang="sa">${a.deva}</span></h3>
        <p class="avatar__yuga mono">${a.yuga} Yuga · ${P(a.stage)}</p>
        <p class="avatar__text">${P(a.text)}</p>
      </article>`).join('');
    this.cards = Array.from(this.track.querySelectorAll<HTMLElement>('.avatar'));
    this.active = -1;
  }

  update(f: Frame) {
    const p = f.chapters.progress('avatara');
    this.head.classList.toggle('is-dim', p > 0.07);
    const target = clamp((p - 0.1) / 0.84) * (AVATARS.length - 1);
    this.pos += (target - this.pos) * Math.min(1, f.dt * 5);
    const W = this.track.parentElement!.clientWidth;
    const card = this.cards[0]?.offsetWidth ?? 300;
    const gap = card * 0.18;
    const x = W / 2 - card / 2 - this.pos * (card + gap);
    this.track.style.transform = `translate3d(${x}px, 0, 0)`;
    this.cards.forEach((c, i) => {
      const d = Math.abs(i - this.pos);
      c.style.opacity = String(Math.max(0.18, 1 - d * 0.55));
      c.style.transform = `scale(${1 - Math.min(d, 2) * 0.1}) translateY(${Math.min(d, 2) * 18}px)`;
      c.classList.toggle('is-active', d < 0.5);
    });
    this.marker.style.left = `${(this.pos / (AVATARS.length - 1)) * 100}%`;
    const idx = Math.round(this.pos);
    if (idx !== this.active) {
      this.active = idx;
      this.stageLabel.textContent = i18n.pick(AVATARS[idx].stage);
      audio.chime(392 * Math.pow(2, [0, 2, 4, 5, 7, 9, 11, 12, 14, 16][idx] / 12), 0.04);
    }
  }
}
