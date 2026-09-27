import type { L } from './deities';

export interface Verse { ref: string; sa: string; iast: string; tr: L; note?: L }

/* One verse for each of the eighteen chapters. Translations are free renderings. */
export const VERSES: Verse[] = [
  {
    ref: '1.1', sa: 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥',
    iast: 'dharma-kṣetre kuru-kṣetre samavetā yuyutsavaḥ / māmakāḥ pāṇḍavāś caiva kim akurvata sañjaya',
    tr: { en: 'On the field of dharma, the field of the Kurus, gathered and eager to fight — my sons and the sons of Pāṇḍu: what did they do, Sañjaya?', nl: 'Op het veld van dharma, het veld van de Kuru’s, verzameld en strijdlustig — mijn zonen en de zonen van Pāṇḍu: wat deden zij, Sañjaya?' },
    note: { en: 'The first words of the Gītā, asked by the blind king Dhṛtarāṣṭra.', nl: 'De eerste woorden van de Gītā, gevraagd door de blinde koning Dhṛtarāṣṭra.' },
  },
  {
    ref: '2.47', sa: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
    iast: 'karmaṇy evādhikāras te mā phaleṣu kadācana / mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi',
    tr: { en: 'Your right is to the action alone, never to its fruits. Do not let the fruit be your motive — nor cling to doing nothing.', nl: 'Je recht geldt alleen het handelen, nooit de vruchten ervan. Laat de vrucht niet je drijfveer zijn — en hecht je ook niet aan niets-doen.' },
  },
  {
    ref: '3.35', sa: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात् ।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः ॥',
    iast: 'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt / sva-dharme nidhanaṃ śreyaḥ para-dharmo bhayāvahaḥ',
    tr: { en: 'Better your own dharma, done imperfectly, than another’s done well. Better to die in your own; another’s path is full of fear.', nl: 'Beter je eigen dharma, onvolmaakt vervuld, dan die van een ander, goed vervuld. Beter te sterven in je eigen weg; de weg van een ander is vol angst.' },
  },
  {
    ref: '4.7', sa: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥',
    iast: 'yadā yadā hi dharmasya glānir bhavati bhārata / abhyutthānam adharmasya tadātmānaṃ sṛjāmy aham',
    tr: { en: 'Whenever dharma declines, O Bhārata, and adharma rises, then I bring myself forth.', nl: 'Telkens wanneer dharma afneemt, o Bhārata, en adharma opkomt, breng ik mijzelf voort.' },
  },
  {
    ref: '5.18', sa: 'विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि ।\nशुनि चैव श्वपाके च पण्डिताः समदर्शिनः ॥',
    iast: 'vidyā-vinaya-sampanne brāhmaṇe gavi hastini / śuni caiva śva-pāke ca paṇḍitāḥ sama-darśinaḥ',
    tr: { en: 'In a learned and humble sage, in a cow, an elephant, a dog, and in the outcast — the wise see the same.', nl: 'In een geleerde en bescheiden wijze, in een koe, een olifant, een hond en in de verstotene — de wijzen zien hetzelfde.' },
  },
  {
    ref: '6.5', sa: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥',
    iast: 'uddhared ātmanātmānaṃ nātmānam avasādayet / ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
    tr: { en: 'Lift yourself up by yourself; do not let yourself sink. For you alone are your own friend, and you alone your own enemy.', nl: 'Til jezelf op door jezelf; laat jezelf niet wegzakken. Want jij alleen bent je eigen vriend, en jij alleen je eigen vijand.' },
  },
  {
    ref: '7.7', sa: 'मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय ।\nमयि सर्वमिदं प्रोतं सूत्रे मणिगणा इव ॥',
    iast: 'mattaḥ parataraṃ nānyat kiñcid asti dhanañjaya / mayi sarvam idaṃ protaṃ sūtre maṇi-gaṇā iva',
    tr: { en: 'There is nothing higher than me, Dhanañjaya. All this is strung on me like pearls on a thread.', nl: 'Er is niets hogers dan ik, Dhanañjaya. Dit alles is aan mij geregen als parels aan een draad.' },
  },
  {
    ref: '8.5', sa: 'अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम् ।\nयः प्रयाति स मद्भावं याति नास्त्यत्र संशयः ॥',
    iast: 'anta-kāle ca mām eva smaran muktvā kalevaram / yaḥ prayāti sa mad-bhāvaṃ yāti nāsty atra saṃśayaḥ',
    tr: { en: 'Whoever, at the hour of death, leaves the body remembering me alone, comes to my being — of this there is no doubt.', nl: 'Wie in het uur van de dood het lichaam verlaat terwijl hij alleen aan mij denkt, komt tot mijn wezen — daarover bestaat geen twijfel.' },
  },
  {
    ref: '9.26', sa: 'पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति ।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः ॥',
    iast: 'patraṃ puṣpaṃ phalaṃ toyaṃ yo me bhaktyā prayacchati / tad ahaṃ bhakty-upahṛtam aśnāmi prayatātmanaḥ',
    tr: { en: 'A leaf, a flower, a fruit, a little water — whoever offers it to me with love, that gift of a pure heart I accept.', nl: 'Een blad, een bloem, een vrucht, een beetje water — wie het mij met liefde aanbiedt, die gave van een zuiver hart aanvaard ik.' },
  },
  {
    ref: '10.20', sa: 'अहमात्मा गुडाकेश सर्वभूताशयस्थितः ।\nअहमादिश्च मध्यं च भूतानामन्त एव च ॥',
    iast: 'aham ātmā guḍākeśa sarva-bhūtāśaya-sthitaḥ / aham ādiś ca madhyaṃ ca bhūtānām anta eva ca',
    tr: { en: 'I am the Self, Guḍākeśa, seated in the heart of every being. I am the beginning, the middle and the end of all that lives.', nl: 'Ik ben het Zelf, Guḍākeśa, gezeten in het hart van elk wezen. Ik ben het begin, het midden en het einde van al wat leeft.' },
  },
  {
    ref: '11.32', sa: 'कालोऽस्मि लोकक्षयकृत्प्रवृद्धो लोकान्समाहर्तुमिह प्रवृत्तः ।\nऋतेऽपि त्वां न भविष्यन्ति सर्वे येऽवस्थिताः प्रत्यनीकेषु योधाः ॥',
    iast: 'kālo ’smi loka-kṣaya-kṛt pravṛddho lokān samāhartum iha pravṛttaḥ / ṛte ’pi tvāṃ na bhaviṣyanti sarve ye ’vasthitāḥ pratyanīkeṣu yodhāḥ',
    tr: { en: 'I am Time, grown vast, destroyer of worlds, come here to gather in the worlds. Even without you, none of the warriors ranged in the opposing armies will survive.', nl: 'Ik ben de Tijd, onmetelijk gegroeid, vernietiger van werelden, hier gekomen om de werelden in te halen. Ook zonder jou zal geen van de krijgers in de tegenoverliggende legers blijven bestaan.' },
    note: { en: 'J. Robert Oppenheimer later recalled this verse, remembering the first atomic test in 1945.', nl: 'J. Robert Oppenheimer herinnerde zich later dit vers, terugdenkend aan de eerste atoomtest in 1945.' },
  },
  {
    ref: '12.13', sa: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च ।\nनिर्ममो निरहङ्कारः समदुःखसुखः क्षमी ॥',
    iast: 'adveṣṭā sarva-bhūtānāṃ maitraḥ karuṇa eva ca / nirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī',
    tr: { en: 'Hating no being, friendly and compassionate, free of “mine” and of ego, the same in sorrow and in joy, forgiving — such a one is dear to me.', nl: 'Geen enkel wezen hatend, vriendelijk en mededogend, vrij van “mijn” en van ego, gelijk in verdriet en vreugde, vergevend — zo iemand is mij dierbaar.' },
  },
  {
    ref: '13.27', sa: 'समं सर्वेषु भूतेषु तिष्ठन्तं परमेश्वरम् ।\nविनश्यत्स्वविनश्यन्तं यः पश्यति स पश्यति ॥',
    iast: 'samaṃ sarveṣu bhūteṣu tiṣṭhantaṃ parameśvaram / vinaśyatsv avinaśyantaṃ yaḥ paśyati sa paśyati',
    tr: { en: 'Whoever sees the supreme Lord dwelling alike in all beings — the undying within the dying — truly sees.', nl: 'Wie de hoogste Heer gelijkelijk ziet wonen in alle wezens — het onsterfelijke in het sterfelijke — die ziet werkelijk.' },
  },
  {
    ref: '14.5', sa: 'सत्त्वं रजस्तम इति गुणाः प्रकृतिसम्भवाः ।\nनिबध्नन्ति महाबाहो देहे देहिनमव्ययम् ॥',
    iast: 'sattvaṃ rajas tama iti guṇāḥ prakṛti-sambhavāḥ / nibadhnanti mahā-bāho dehe dehinam avyayam',
    tr: { en: 'Clarity, passion and inertia — the three qualities born of nature — bind the imperishable dweller to the body, mighty-armed one.', nl: 'Helderheid, hartstocht en traagheid — de drie kwaliteiten die uit de natuur voortkomen — binden de onvergankelijke bewoner aan het lichaam, o sterkgearmde.' },
  },
  {
    ref: '15.7', sa: 'ममैवांशो जीवलोके जीवभूतः सनातनः ।\nमनःषष्ठानीन्द्रियाणि प्रकृतिस्थानि कर्षति ॥',
    iast: 'mamaivāṃśo jīva-loke jīva-bhūtaḥ sanātanaḥ / manaḥ-ṣaṣṭhānīndriyāṇi prakṛti-sthāni karṣati',
    tr: { en: 'An eternal fragment of myself becomes a living soul in the world of the living, and draws to itself the senses — the mind the sixth — that rest in nature.', nl: 'Een eeuwig deeltje van mijzelf wordt een levende ziel in de wereld van de levenden, en trekt de zintuigen tot zich — de geest als zesde — die in de natuur rusten.' },
    note: { en: 'Sanātana — “eternal” — the very word that names this tradition.', nl: 'Sanātana — “eeuwig” — precies het woord dat deze traditie haar naam geeft.' },
  },
  {
    ref: '16.21', sa: 'त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः ।\nकामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत् ॥',
    iast: 'tri-vidhaṃ narakasyedaṃ dvāraṃ nāśanam ātmanaḥ / kāmaḥ krodhas tathā lobhas tasmād etat trayaṃ tyajet',
    tr: { en: 'Threefold is the gate of hell, the ruin of the self: desire, anger and greed. Therefore let these three go.', nl: 'Drievoudig is de poort van de hel, de ondergang van het zelf: begeerte, woede en hebzucht. Laat daarom deze drie los.' },
  },
  {
    ref: '17.20', sa: 'दातव्यमिति यद्दानं दीयतेऽनुपकारिणे ।\nदेशे काले च पात्रे च तद्दानं सात्त्विकं स्मृतम् ॥',
    iast: 'dātavyam iti yad dānaṃ dīyate ’nupakāriṇe / deśe kāle ca pātre ca tad dānaṃ sāttvikaṃ smṛtam',
    tr: { en: 'A gift given simply because it is right to give, to one who cannot repay, at the right place and time and to the right person — that gift is called pure.', nl: 'Een gave die gegeven wordt eenvoudig omdat geven juist is, aan iemand die niets kan terugdoen, op de juiste plaats en tijd en aan de juiste persoon — die gave heet zuiver.' },
  },
  {
    ref: '18.66', sa: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥',
    iast: 'sarva-dharmān parityajya mām ekaṃ śaraṇaṃ vraja / ahaṃ tvā sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ',
    tr: { en: 'Let go of every duty and take refuge in me alone. I will free you from all wrong — do not grieve.', nl: 'Laat elke plicht los en zoek je toevlucht bij mij alleen. Ik zal je bevrijden van alle kwaad — treur niet.' },
    note: { en: 'Often called the culminating verse (carama-śloka) of the Gītā.', nl: 'Vaak het slotvers (carama-śloka) van de Gītā genoemd.' },
  },
];
