export type L = { en: string; nl: string };
export interface Deity {
  id: string;
  name: string;
  deva: string;
  color: string;
  icon: 'om' | 'trishula' | 'chakra' | 'lotus' | 'veena' | 'shrim' | 'dum' | 'krim' | 'feather' | 'bow' | 'gada' | 'vel';
  petals: number;
  epithet: L;
  text: L;
  attrs: L;
  vahana: L;
  consort: L;
  mantra: string;
  mantraTr: L;
}

export const DEITIES: Deity[] = [
  {
    id: 'ganesha', name: 'Gaṇeśa', deva: 'गणेश', color: '#ff9a3c', icon: 'om', petals: 8,
    epithet: { en: 'Lord of beginnings, remover of obstacles', nl: 'Heer van het begin, wegnemer van obstakels' },
    text: {
      en: 'The elephant-headed son of Śiva and Pārvatī is invoked before every undertaking — a journey, a wedding, a new book. Patron of learning and letters, he wrote down the Mahābhārata as the sage Vyāsa dictated it, breaking off his own tusk to use as a pen. His rounded form is said to mirror the shape of Om.',
      nl: 'De zoon van Śiva en Pārvatī met het olifantenhoofd wordt aangeroepen vóór elke onderneming — een reis, een bruiloft, een nieuw boek. Als beschermer van kennis en letters schreef hij de Mahābhārata op terwijl de wijze Vyāsa dicteerde, en brak daarvoor zijn eigen slagtand af als pen. Zijn ronde vorm zou de vorm van Om weerspiegelen.',
    },
    attrs: { en: 'broken tusk, goad, noose, a sweet modaka', nl: 'gebroken slagtand, prikstok, lasso, een zoete modaka' },
    vahana: { en: 'a mouse (mūṣaka)', nl: 'een muis (mūṣaka)' },
    consort: { en: 'Buddhi and Siddhi — wisdom and success', nl: 'Buddhi en Siddhi — wijsheid en succes' },
    mantra: 'ॐ गं गणपतये नमः', mantraTr: { en: 'Om gaṃ — salutations to Gaṇapati', nl: 'Om gaṃ — eerbied voor Gaṇapati' },
  },
  {
    id: 'shiva', name: 'Śiva', deva: 'शिव', color: '#8fb4ff', icon: 'trishula', petals: 5,
    epithet: { en: 'The Auspicious One', nl: 'De Heilzame' },
    text: {
      en: 'Ascetic of Mount Kailāsa, lord of yogis, of dance and of dissolution — the one who destroys illusion so that truth can appear. He is worshipped above all as the liṅga, a pillar of formless light. His throat is blue from swallowing the poison that rose when gods and demons churned the cosmic ocean.',
      nl: 'Asceet van de berg Kailāsa, heer van de yogi’s, van de dans en van de ontbinding — hij die illusie vernietigt zodat waarheid kan verschijnen. Hij wordt vooral vereerd als de liṅga, een zuil van vormloos licht. Zijn keel is blauw van het gif dat hij doorslikte toen goden en demonen de kosmische oceaan karnden.',
    },
    attrs: { en: 'trident, ḍamaru drum, crescent moon, the Gaṅgā in his hair, third eye', nl: 'drietand, ḍamaru-trommel, maansikkel, de Gaṅgā in zijn haar, derde oog' },
    vahana: { en: 'the bull Nandī', nl: 'de stier Nandī' },
    consort: { en: 'Pārvatī', nl: 'Pārvatī' },
    mantra: 'ॐ नमः शिवाय', mantraTr: { en: 'Om — salutations to Śiva', nl: 'Om — eerbied voor Śiva' },
  },
  {
    id: 'vishnu', name: 'Viṣṇu', deva: 'विष्णु', color: '#5aa2ff', icon: 'chakra', petals: 12,
    epithet: { en: 'The All-pervading, preserver of the worlds', nl: 'De Alles-doordringende, behoeder van de werelden' },
    text: {
      en: 'Resting on the serpent Ananta in the ocean between creations, Viṣṇu dreams the universe into being. Whenever dharma declines, he descends as an avatāra — the fish, the tortoise, the boar, the man-lion, the dwarf, Paraśurāma, Rāma, Kṛṣṇa, Buddha, and Kalki who is yet to come.',
      nl: 'Rustend op de slang Ananta in de oceaan tussen twee scheppingen droomt Viṣṇu het universum tot leven. Telkens wanneer dharma afneemt, daalt hij neer als avatāra — de vis, de schildpad, het everzwijn, de mens-leeuw, de dwerg, Paraśurāma, Rāma, Kṛṣṇa, Boeddha, en Kalki die nog moet komen.',
    },
    attrs: { en: 'conch, the discus Sudarśana, mace, lotus', nl: 'schelphoorn, de discus Sudarśana, knots, lotus' },
    vahana: { en: 'Garuḍa, king of birds', nl: 'Garuḍa, koning der vogels' },
    consort: { en: 'Lakṣmī', nl: 'Lakṣmī' },
    mantra: 'ॐ नमो नारायणाय', mantraTr: { en: 'Om — salutations to Nārāyaṇa', nl: 'Om — eerbied voor Nārāyaṇa' },
  },
  {
    id: 'brahma', name: 'Brahmā', deva: 'ब्रह्मा', color: '#ffd27a', icon: 'lotus', petals: 4,
    epithet: { en: 'The Creator', nl: 'De Schepper' },
    text: {
      en: 'Born on a lotus that rises from Viṣṇu’s navel, Brahmā shapes the worlds anew at the dawn of every kalpa. His four faces recite the four Vedas in the four directions. Curiously, he is hardly worshipped in temples — the one at Pushkar in Rajasthan is famous precisely because it is so rare.',
      nl: 'Geboren op een lotus die oprijst uit de navel van Viṣṇu, vormt Brahmā de werelden opnieuw bij de dageraad van elke kalpa. Zijn vier gezichten reciteren de vier Veda’s in de vier windrichtingen. Merkwaardig genoeg wordt hij nauwelijks in tempels vereerd — die in Pushkar in Rajasthan is juist beroemd omdat hij zo zeldzaam is.',
    },
    attrs: { en: 'the Vedas, water pot, rosary, lotus', nl: 'de Veda’s, waterkruik, gebedssnoer, lotus' },
    vahana: { en: 'a swan (haṃsa)', nl: 'een zwaan (haṃsa)' },
    consort: { en: 'Sarasvatī', nl: 'Sarasvatī' },
    mantra: 'ॐ ब्रह्मणे नमः', mantraTr: { en: 'Om — salutations to Brahmā', nl: 'Om — eerbied voor Brahmā' },
  },
  {
    id: 'sarasvati', name: 'Sarasvatī', deva: 'सरस्वती', color: '#f3ead8', icon: 'veena', petals: 16,
    epithet: { en: 'She who flows — goddess of knowledge and the arts', nl: 'Zij die stroomt — godin van kennis en kunsten' },
    text: {
      en: 'Once a mighty river praised in the Ṛg Veda, Sarasvatī became the flowing current of speech, music and wisdom. Dressed in white, seated on a lotus, she plays the vīṇā. Students touch their books to her image before exams; musicians bow to her before a concert.',
      nl: 'Ooit een machtige rivier die in de Ṛg Veda wordt bezongen, werd Sarasvatī de stromende bron van spraak, muziek en wijsheid. In het wit gekleed, gezeten op een lotus, bespeelt zij de vīṇā. Studenten raken hun boeken aan bij haar beeld vóór een examen; musici buigen voor haar vóór een concert.',
    },
    attrs: { en: 'vīṇā, book, rosary, water pot', nl: 'vīṇā, boek, gebedssnoer, waterkruik' },
    vahana: { en: 'a swan, sometimes a peacock', nl: 'een zwaan, soms een pauw' },
    consort: { en: 'Brahmā', nl: 'Brahmā' },
    mantra: 'ॐ ऐं सरस्वत्यै नमः', mantraTr: { en: 'Om aiṃ — salutations to Sarasvatī', nl: 'Om aiṃ — eerbied voor Sarasvatī' },
  },
  {
    id: 'lakshmi', name: 'Lakṣmī', deva: 'लक्ष्मी', color: '#ff7eb0', icon: 'shrim', petals: 8,
    epithet: { en: 'Goddess of fortune, beauty and grace', nl: 'Godin van voorspoed, schoonheid en gratie' },
    text: {
      en: 'Lakṣmī rose from the churning of the cosmic ocean, seated on a lotus, and chose Viṣṇu as her husband. At Dīvālī, millions of little lamps are lit so that she may find her way into every home. Two elephants often pour water over her — Gaja-Lakṣmī, abundance itself.',
      nl: 'Lakṣmī rees op uit het karnen van de kosmische oceaan, gezeten op een lotus, en koos Viṣṇu als echtgenoot. Met Dīvālī worden miljoenen lampjes aangestoken zodat zij de weg naar elk huis kan vinden. Vaak gieten twee olifanten water over haar uit — Gaja-Lakṣmī, overvloed zelf.',
    },
    attrs: { en: 'lotuses, gold coins, pot of plenty', nl: 'lotussen, gouden munten, kruik van overvloed' },
    vahana: { en: 'an owl (ulūka)', nl: 'een uil (ulūka)' },
    consort: { en: 'Viṣṇu', nl: 'Viṣṇu' },
    mantra: 'ॐ श्रीं महालक्ष्म्यै नमः', mantraTr: { en: 'Om śrīṃ — salutations to the great Lakṣmī', nl: 'Om śrīṃ — eerbied voor de grote Lakṣmī' },
  },
  {
    id: 'durga', name: 'Durgā', deva: 'दुर्गा', color: '#ff5a3c', icon: 'dum', petals: 10,
    epithet: { en: 'The Invincible', nl: 'De Onoverwinnelijke' },
    text: {
      en: 'When no god could defeat the buffalo-demon Mahiṣāsura, their combined radiance took the form of a goddess. Each god gave her his weapon; riding a lion, she won. Her nine nights of worship, Navarātri, end in Vijayadaśamī — the day of victory.',
      nl: 'Toen geen enkele god de buffeldemon Mahiṣāsura kon verslaan, nam hun gebundelde glans de gedaante aan van een godin. Elke god gaf haar zijn wapen; rijdend op een leeuw overwon zij. Haar negen nachten van verering, Navarātri, eindigen met Vijayadaśamī — de dag van de overwinning.',
    },
    attrs: { en: 'ten arms bearing trident, discus, sword, bow, conch, lotus', nl: 'tien armen met drietand, discus, zwaard, boog, schelphoorn, lotus' },
    vahana: { en: 'a lion or tiger', nl: 'een leeuw of tijger' },
    consort: { en: 'a form of Pārvatī, the consort of Śiva', nl: 'een vorm van Pārvatī, de gemalin van Śiva' },
    mantra: 'ॐ दुं दुर्गायै नमः', mantraTr: { en: 'Om duṃ — salutations to Durgā', nl: 'Om duṃ — eerbied voor Durgā' },
  },
  {
    id: 'kali', name: 'Kālī', deva: 'काली', color: '#9d7bff', icon: 'krim', petals: 5,
    epithet: { en: 'She who is Time — the dark mother', nl: 'Zij die Tijd is — de donkere moeder' },
    text: {
      en: 'The fiercest face of the Goddess: she devours time itself and the demons of ego, a garland of heads around her neck, her tongue red. And yet for her devotees in Bengal she is the most tender of mothers — the saint Rāmakṛṣṇa spoke to her as a child speaks to its mother.',
      nl: 'Het felste gezicht van de Godin: zij verslindt de tijd zelf en de demonen van het ego, met een krans van hoofden om haar hals en een rode tong. En toch is zij voor haar toegewijden in Bengalen de tederste van alle moeders — de heilige Rāmakṛṣṇa sprak tot haar zoals een kind tot zijn moeder spreekt.',
    },
    attrs: { en: 'sword, severed head, gestures of fearlessness and blessing', nl: 'zwaard, afgehakt hoofd, gebaren van onbevreesdheid en zegen' },
    vahana: { en: 'she stands upon Śiva', nl: 'zij staat op Śiva' },
    consort: { en: 'Śiva as Mahākāla, great Time', nl: 'Śiva als Mahākāla, de grote Tijd' },
    mantra: 'ॐ क्रीं काल्यै नमः', mantraTr: { en: 'Om krīṃ — salutations to Kālī', nl: 'Om krīṃ — eerbied voor Kālī' },
  },
  {
    id: 'krishna', name: 'Kṛṣṇa', deva: 'कृष्ण', color: '#3f7fff', icon: 'feather', petals: 16,
    epithet: { en: 'The Dark One, the All-attractive', nl: 'De Donkere, de Alles-aantrekkende' },
    text: {
      en: 'The eighth avatāra of Viṣṇu wears many faces: the butter-stealing child of Vṛndāvana, the flute-player whose music draws Rādhā and the cowherd girls into the forest at night, the statesman — and the charioteer who speaks the Bhagavad Gītā on the battlefield.',
      nl: 'De achtste avatāra van Viṣṇu heeft vele gezichten: het boterstelende kind van Vṛndāvana, de fluitspeler wiens muziek Rādhā en de koeherderinnen ’s nachts het bos in lokt, de staatsman — en de wagenmenner die op het slagveld de Bhagavad Gītā uitspreekt.',
    },
    attrs: { en: 'bamboo flute, peacock feather, yellow silk, blue-dark skin', nl: 'bamboefluit, pauwenveer, gele zijde, donkerblauwe huid' },
    vahana: { en: 'Garuḍa, as Viṣṇu', nl: 'Garuḍa, als Viṣṇu' },
    consort: { en: 'Rādhā; Rukmiṇī', nl: 'Rādhā; Rukmiṇī' },
    mantra: 'ॐ नमो भगवते वासुदेवाय', mantraTr: { en: 'Om — salutations to the Lord Vāsudeva', nl: 'Om — eerbied voor de Heer Vāsudeva' },
  },
  {
    id: 'rama', name: 'Rāma', deva: 'राम', color: '#5fd18a', icon: 'bow', petals: 7,
    epithet: { en: 'The one who delights — the ideal of dharma', nl: 'Hij die verblijdt — het ideaal van dharma' },
    text: {
      en: 'The seventh avatāra, prince of Ayodhyā and hero of the Rāmāyaṇa, followed dharma as son, husband and king — even into fourteen years of exile. When he finally came home with Sītā after defeating Rāvaṇa, the city lit rows of lamps: the first Dīvālī.',
      nl: 'De zevende avatāra, prins van Ayodhyā en held van de Rāmāyaṇa, volgde dharma als zoon, echtgenoot en koning — zelfs tot in veertien jaar ballingschap. Toen hij na de overwinning op Rāvaṇa eindelijk met Sītā thuiskwam, stak de stad rijen lampjes aan: de eerste Dīvālī.',
    },
    attrs: { en: 'the bow Kodaṇḍa and arrows', nl: 'de boog Kodaṇḍa en pijlen' },
    vahana: { en: '—', nl: '—' },
    consort: { en: 'Sītā', nl: 'Sītā' },
    mantra: 'श्री राम जय राम जय जय राम', mantraTr: { en: 'Glorious Rāma — victory to Rāma', nl: 'Glorierijke Rāma — overwinning aan Rāma' },
  },
  {
    id: 'hanuman', name: 'Hanumān', deva: 'हनुमान्', color: '#ff7a2a', icon: 'gada', petals: 11,
    epithet: { en: 'Son of the wind, the perfect devotee', nl: 'Zoon van de wind, de volmaakte toegewijde' },
    text: {
      en: 'For love of Rāma, Hanumān leapt across the ocean to Laṅkā to find Sītā, and when a healing herb was needed he carried back the whole mountain. He is strength and courage placed entirely in the service of devotion — and so he is the friend of everyone who is afraid.',
      nl: 'Uit liefde voor Rāma sprong Hanumān over de oceaan naar Laṅkā om Sītā te vinden, en toen er een geneeskrachtig kruid nodig was, droeg hij de hele berg terug. Hij is kracht en moed, volledig in dienst van toewijding — en daarom de vriend van iedereen die bang is.',
    },
    attrs: { en: 'mace, the mountain of healing herbs', nl: 'knots, de berg met geneeskrachtige kruiden' },
    vahana: { en: 'he flies on his own', nl: 'hij vliegt zelf' },
    consort: { en: 'a lifelong celibate (brahmacārī)', nl: 'levenslang celibatair (brahmacārī)' },
    mantra: 'ॐ हं हनुमते नमः', mantraTr: { en: 'Om haṃ — salutations to Hanumān', nl: 'Om haṃ — eerbied voor Hanumān' },
  },
  {
    id: 'murugan', name: 'Murugan', deva: 'मुरुगन्', color: '#ff4d6d', icon: 'vel', petals: 6,
    epithet: { en: 'Kārttikeya, the youthful one — beloved of the Tamils', nl: 'Kārttikeya, de jeugdige — geliefd bij de Tamils' },
    text: {
      en: 'Son of Śiva and Pārvatī, born of six sparks and raised by six mothers, he has six faces (Ṣaṇmukha). Commander of the army of the gods, he defeated the demon Sūrapadman with the vel, the spear his mother gave him. At Thaipusam, devotees carry offerings to his hill-temples.',
      nl: 'Zoon van Śiva en Pārvatī, geboren uit zes vonken en grootgebracht door zes moeders, heeft hij zes gezichten (Ṣaṇmukha). Als aanvoerder van het leger der goden versloeg hij de demon Sūrapadman met de vel, de speer die zijn moeder hem gaf. Met Thaipusam dragen toegewijden offergaven naar zijn heuveltempels.',
    },
    attrs: { en: 'the vel (spear), rooster banner', nl: 'de vel (speer), haanbanier' },
    vahana: { en: 'the peacock Paravāṇi', nl: 'de pauw Paravāṇi' },
    consort: { en: 'Valli and Devasenā', nl: 'Valli en Devasenā' },
    mantra: 'ॐ शरवणभवाय नमः', mantraTr: { en: 'Om — salutations to him born in the reed forest', nl: 'Om — eerbied voor hem die in het rietbos werd geboren' },
  },
];
