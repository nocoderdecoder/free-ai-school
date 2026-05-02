// @ts-nocheck
import { useState, useEffect, useRef } from "react";

const TOPICS = [
  "The migratory journey of monarch butterflies across North America",
  "How mantis shrimps perceive sixteen types of color receptors",
  "How tardigrades survive in the vacuum of outer space",
  "The waggle dance communication system of honeybees",
  "How octopuses change color and texture despite being colorblind",
  "The pistol shrimp that creates shockwaves hotter than the sun's surface",
  "How plants communicate distress through underground fungal networks",
  "The lifecycle of Pacific salmon and their role in forest ecosystems",
  "How the axolotl salamander can regrow entire limbs and organs",
  "The bombardier beetle's explosive chemical defense mechanism",
  "How archerfish hunt by shooting precise jets of water at insects",
  "The collective intelligence of slime molds with no brain or neurons",
  "How cleaner wrasse fish run underwater cleaning stations for other species",
  "The mutualistic relationship between ants and acacia trees",
  "How crows use tools, plan for the future, and recognize human faces",
  "The strange reproduction strategy of the anglerfish",
  "How migratory birds use Earth's magnetic field for navigation",
  "The symbiosis between clownfish and sea anemones",
  "How electric eels generate and weaponize electricity",
  "The unique social hierarchy of naked mole-rat colonies",
  "How the Phoenicians invented the modern phonetic alphabet",
  "The Inca rope-bridge engineering across Andean gorges",
  "How the printing press ignited the Protestant Reformation",
  "The medieval practice of trial by combat in European courts",
  "How Viking navigators crossed the Atlantic using sun stones",
  "The forgotten female pharaohs who ruled ancient Egypt",
  "How carrier pigeons served as critical communications in World War One",
  "The Black Death and how it permanently reshuffled European social order",
  "The Antikythera mechanism: the world's oldest known analog computer",
  "How ancient Rome engineered a citywide water distribution network",
  "The Great Fire of London and how it triggered modern urban planning",
  "The Byzantine Empire's Greek fire weapon lost to history",
  "How the Tang Dynasty created the world's first paper money",
  "The Inca quipu knot-based recording system without written language",
  "How ancient Egyptians mummified bodies using natron salt",
  "The Polynesian wayfinding techniques that colonized the Pacific Ocean",
  "How the construction of the Panama Canal killed tens of thousands",
  "The Silk Road's role as an ancient superhighway of ideas and disease",
  "How medieval European guilds controlled quality, training, and wages",
  "The history of the assassination that started World War One",
  "How superconductors lose all electrical resistance near absolute zero",
  "The physics of why soap bubbles are always perfectly spherical",
  "How quantum entanglement allows instant correlation across any distance",
  "Why ice is slippery and scientists only recently agreed on the answer",
  "How gravitational waves are detected by mirrors four kilometers apart",
  "The nuclear fusion reactions that power the sun for billions of years",
  "The physics of why a boomerang returns to the thrower",
  "How aurora borealis forms where solar wind meets Earth's magnetosphere",
  "The discovery of absolute zero and the quest to reach it in a lab",
  "How dark matter makes up most of the universe but remains undetected",
  "The physics of why objects in freefall are weightless",
  "How the double-slit experiment shattered classical ideas of physics",
  "The Casimir effect where vacuum produces a measurable physical force",
  "How the geology of Iceland places it on two diverging tectonic plates",
  "How the Sahara Desert was a lush savanna just ten thousand years ago",
  "The underground city of Derinkuyu carved into Cappadocian rock",
  "How Venice was constructed on millions of wooden stakes in a lagoon",
  "The formation of the Grand Canyon by slow erosion over five million years",
  "How Greenland's ice sheet stores 800,000 years of climate history",
  "The isolated evolutionary laboratory of the Galápagos Islands",
  "How Singapore transformed from a malarial swamp to a global city",
  "The ancient underground rivers beneath Mexico's Yucatán Peninsula",
  "How Patagonia's wind patterns create one of Earth's most extreme climates",
  "The hydrothermal vents at the bottom of the ocean and their bizarre life",
  "How Dead Sea salt levels make everything buoyant in its water",
  "The chemistry of fermentation and how it preserves and transforms food",
  "How saffron became worth more than gold per gram",
  "The global journey of the chili pepper from Mexico to every cuisine",
  "How ancient Mesoamericans first processed cacao into chocolate",
  "The chemistry of why bread rises when yeast consumes sugar",
  "How salt shaped trade routes, wars, and economic power for millennia",
  "The discovery of umami as a fifth taste beyond sweet, sour, salt, bitter",
  "How sake is brewed using a centuries-old enzymatic koji fermentation",
  "The origins of cheese-making in Neolithic Mesopotamia",
  "How Japanese dashi broth unlocks deep savory flavor with minimal ingredients",
  "The role of spices in funding Europe's age of exploration and colonization",
  "How the Maillard reaction produces the flavors of seared and roasted food",
  "The history of olive oil as currency, medicine, and religion",
  "How blue cheese gets its distinctive mold veins and flavor",
  "The unexpected chemistry of why onions make your eyes water",
  "How confirmation bias makes humans resist information that challenges beliefs",
  "The bystander effect and why crowds dissolve individual responsibility",
  "How sleep deprivation dismantles cognition faster than alcohol intoxication",
  "The psychology of why habits are so easy to form and so hard to break",
  "How nostalgia distorts memory to make the past feel better than it was",
  "The phenomenon of flow states and what neuroscience reveals about them",
  "How optical illusions expose the brain's predictive shortcuts",
  "The science of why music can unlock emotional memories in dementia patients",
  "How isolation changes human perception of time and self",
  "The role of dopamine in motivation versus the pleasure of reward itself",
  "How mirror neurons enable humans to feel others' pain and joy",
  "The placebo effect producing real measurable physical changes in the body",
  "The cognitive science of why procrastination is fundamentally about emotion",
  "How early childhood memories are often constructed rather than recorded",
  "The Dunning-Kruger effect and why incompetence breeds overconfidence",
  "How Fibonacci numbers appear in sunflower spirals, shells, and galaxies",
  "The mathematics behind GPS triangulating your location to within meters",
  "How prime numbers protect every credit card transaction on the internet",
  "The history of zero and why its invention took thousands of years",
  "How fractals describe coastlines, clouds, and cauliflower mathematically",
  "The paradoxes of infinity and how mathematics handles different sizes of infinite",
  "How actuaries use probability to price life insurance risk accurately",
  "The travelling salesman problem and why it remains computationally unsolvable",
  "The Monty Hall problem and why the correct answer feels deeply wrong",
  "How Shannon's information theory defined the limits of communication",
  "How deep-sea fiber optic cables carry ninety-five percent of global internet traffic",
  "The engineering of skyscrapers that sway several meters in strong winds",
  "How noise-canceling headphones use destructive wave interference",
  "The engineering challenge of boring tunnels under major rivers",
  "How satellites maintain stable orbits without engines burning continuously",
  "The mechanics of a self-winding mechanical watch with no battery",
  "How reinforced concrete changed what shapes buildings could take",
  "The history of glass-making from ancient Egypt to fiber optics",
  "The engineering of suspension bridges spanning thousands of meters",
  "How radio waves were discovered and accidentally led to wireless communication",
  "The transistor invention and how it made modern computing possible",
  "How sonar was developed and transformed underwater navigation and warfare",
  "How LiDAR maps terrain by measuring millions of laser pulses per second",
  "The engineering ingenuity behind ancient Roman concrete that still stands",
  "How the immune system distinguishes between self-cells and foreign invaders",
  "The accidental discovery of penicillin from contaminated petri dishes",
  "How CRISPR-Cas9 cuts and rewrites genetic code with precision",
  "The biology of why humans spend a third of their lives unconscious in sleep",
  "How vaccines train immune memory without causing actual disease",
  "The history of discovering blood types and making transfusions safe",
  "How gut microbiome composition influences mood and mental health",
  "The surprising variation in how fast different wounds heal on the body",
  "How the human nose distinguishes over one trillion different odor combinations",
  "The biology of why certain organisms age while others seem biologically immortal",
  "How anesthesia suppresses consciousness and why its mechanism is still debated",
  "How viruses commandeer cellular machinery to replicate themselves",
  "The neuroscience of how the hippocampus consolidates memories during sleep",
  "How forensic DNA profiling transformed criminal investigation",
  "The biology of pain receptors and why some people are born unable to feel pain",
  "How black holes warp spacetime so severely that light cannot escape",
  "The science of how nebulae collapse under gravity to ignite as stars",
  "How the James Webb Telescope sees galaxies formed 100 million years after the Big Bang",
  "The Voyager probe's messages encoded for extraterrestrial civilizations",
  "How comets preserve pristine material from the solar system's formation",
  "How astronomers measure the distance to stars billions of light-years away",
  "The mystery of fast radio bursts arriving from distant unknown sources",
  "How neutron stars pack more mass than the sun into a city-sized sphere",
  "The slow disappearance of Saturn's iconic ring system over time",
  "How pulsars were mistaken for alien signals when first detected in 1967",
  "The terraforming proposals for Mars and the chemistry challenges involved",
  "How Renaissance painters used geometry and linear perspective to reshape art",
  "The oral storytelling tradition of West African griots as living libraries",
  "How cave paintings from 45,000 years ago were made with ochre and charcoal",
  "The mathematics and symmetry principles embedded in Islamic geometric patterns",
  "How the Bauhaus movement fused art with industrial manufacturing philosophy",
  "The spiritual philosophy and precise choreography of the Japanese tea ceremony",
  "How Gregorian chant structured Western music for five hundred years",
  "The Aboriginal Australian songline tradition that encodes navigation in melody",
  "How propaganda posters psychologically mobilized civilian populations in wartime",
  "The emergence of street photography as a democratic documentary art form",
  "How the Dutch tulip mania became history's first recorded speculative bubble",
  "The economics of why diamonds maintain artificial scarcity and perceived value",
  "How microfinance transformed small-scale lending in developing economies",
  "The economic ripple effects of the 1973 OPEC oil embargo on Western nations",
  "How free open-source software became commercially indispensable",
  "The history of credit cards and how they restructured consumer psychology",
  "How remittances from migrant workers sustain entire national economies",
  "The economic paradox of why cheap goods sometimes destroy local industries",
  "How futures markets allow farmers to hedge against unpredictable harvests",
  "The economic theory of comparative advantage and why countries specialize",
  "How the Rosetta Stone unlocked the mystery of Egyptian hieroglyphics",
  "The linguistic puzzle of how human language first evolved from grunts",
  "How sign languages develop full grammatical structure independently",
  "The Sapir-Whorf hypothesis that language shapes how you perceive reality",
  "How creole languages emerge when communities share no common tongue",
  "The global race to document and preserve languages dying with their last speakers",
  "How a single mistranslation during Cold War diplomacy nearly caused war",
  "How children acquire language without formal instruction before age four",
  "Why profanity is processed differently in the brain than ordinary speech",
  "The whistled languages of mountain communities used to communicate across valleys",
  "How gift economies function in societies without money or markets",
  "The anthropology of handshaking and its origins in demonstrating peaceable intent",
  "How industrialization broke apart the multi-generational family household",
  "The social mechanics of how fashion trends spread and collapse",
  "How internet communities develop distinct dialects, memes, and social norms",
  "The anthropological function of funeral rituals across radically different cultures",
  "How social hierarchies spontaneously form even in intentionally equal groups",
  "The evolutionary role of gossip in maintaining social cohesion",
  "How nomadic cultures conceptualize land ownership without fixed property",
  "The sociology of why humans are drawn to horror, fear, and dark stories",
  "How coral reefs engineer their own ecosystems through collective calcium deposits",
  "The history of acid rain and how international policy eventually reversed it",
  "How reintroducing wolves to Yellowstone transformed the entire river system",
  "The ecological role of fungi as decomposers connecting every forest organism",
  "How beavers reshape entire river catchments through dam construction",
  "How it takes 500 years for a single centimeter of topsoil to form naturally",
  "The ecological disruption caused by invasive species entering new environments",
  "How the ozone hole forms through chlorofluorocarbon chemistry in the stratosphere",
  "The vital coastal protection role of mangrove forests during storm surges",
  "The mass migration of wildebeest across the Serengeti and its ecological purpose",
  "The trolley problem and what it reveals about how humans make moral trade-offs",
  "How ancient Roman Stoics practiced philosophy as a daily mental discipline",
  "The Ship of Theseus paradox and what it means for identity through change",
  "How the prisoner's dilemma explains why rational actors often choose mutual harm",
  "The philosophical debate over what constitutes a justifiable armed conflict",
  "How existentialism emerged from European intellectuals confronting post-war trauma",
  "The utilitarian calculus of maximizing aggregate happiness across a population",
  "The centuries-old free will debate and whether neuroscience has settled it",
  "How Athenian democracy functioned and how it excluded most of its population",
  "The ethical dilemmas raised by autonomous vehicles making life-or-death decisions",
  "How the Napoleonic Code reshaped legal systems across Europe and its colonies",
  "The revolutionary concept of trial by jury and why it spread globally",
  "How international maritime law governs crimes committed in open ocean",
  "The development of intellectual property law after the industrial revolution",
  "How forensic toxicology developed to detect poisons invisible to the naked eye",
  "How Gothic cathedrals used flying buttresses to build toward impossible heights",
  "The engineering genius behind the unreinforced concrete dome of the Pantheon",
  "How traditional Japanese wooden architecture absorbs earthquake energy safely",
  "Frank Lloyd Wright's philosophy of organic architecture merging buildings with nature",
  "How brutalist architecture became both celebrated and deeply controversial",
  "The acoustic physics behind why Stradivarius violins still sound incomparable",
  "How the Balinese gamelan orchestras tune each instrument unique to their ensemble",
  "The neuroscience of why minor keys reliably evoke sadness across cultures",
  "How Thomas Edison's recorded sound changed music from live performance to product",
  "The twelve-tone compositional system that abandoned all tonal center",
  "The biomechanics of why certain body proportions dominate specific sports",
  "How training at altitude improves oxygen efficiency at sea level",
  "The actual history behind the marathon legend of the Athenian messenger",
  "How sabermetrics revolutionized baseball by discarding conventional wisdom",
  "The psychological mechanisms behind home advantage in competitive sports",
  "How graphene's single-atom thickness produces extraordinary electrical properties",
  "The molecular structure of rubber that allows it to stretch and recover shape",
  "How Damascus steel achieved legendary properties using carbon nanotube structures",
  "The electrochemical process by which iron oxidizes into rust",
  "How photosynthesis converts photons into chemical bonds with near-perfect efficiency",
  "How sextants enabled precise navigation using only the sun and a horizon",
  "The thermodynamic physics of hot air balloon flight and altitude control",
  "How the magnetic compass transformed exploration and reshaped global power",
  "The superconducting electromagnets that suspend maglev trains in mid-air",
  "How containerization in the 1950s multiplied global trade volume overnight",
  "The contagious yawning phenomenon and what it reveals about empathy",
  "How left-handedness reflects fundamentally different brain hemisphere organization",
  "The counterintuitive behavior of non-Newtonian fluids under stress and impact",
  "How urban heat islands make cities measurably warmer than surrounding countryside",
  "The neuroscience of déjà vu and why the brain creates false familiarity",
  "How desert succulents survive years without a single drop of rain",
  "How Alaskan wood frogs survive being completely frozen solid through winter",
  "The gyroscopic physics that allows spinning tops to defy gravity",
  "How ancient Babylonian astronomers tracked celestial cycles without instruments",
  "The blood type system and why humans carry incompatible varieties",
  "How paper cuts produce disproportionate pain for their actual tissue damage",
  "How limestone caves form over thousands of years through chemical dissolution",
  "How autumn leaves change color as trees reclaim chlorophyll from their leaves",
  "The mysterious collective intelligence emerging from simple ant pheromone signals",
  "How ancient Greek astronomers predicted solar eclipses centuries in advance",
  "The science of why night owls and early birds have genuinely different biology",
  "How soil composition determines agricultural viability and civilization location",
  "The evolutionary origins of music and its role in human social bonding",
  "Why human flavor perception is overwhelmingly driven by olfaction not taste buds",
  "How resonance frequencies can cause bridges to oscillate to destruction",
  "How early humans used controlled fire to transform landscapes and diet",
  "Why atmospheric scattering makes sunsets red while the sky stays blue during the day",
  "How pre-industrial dyers produced colors that outlasted centuries of washing",
  "The psychology of anthropomorphism and why humans see faces everywhere",
  "How ancient trade networks carried plague from Central Asia to every continent",
  "How bristlecone pines survive for over five thousand years in harsh conditions",
  "How light pollution is disrupting nocturnal animal navigation and reproduction",
  "How the inner ear's semicircular canals maintain human balance and orientation",
  "The exponential growth mathematics underlying disease spread and compound interest",
  "How medieval European mapmakers filled unknown regions with imagined monsters",
  "The regenerative biology allowing certain starfish to regrow from a single arm",
  "How the 1815 Tambora eruption caused global crop failure and famine",
  "The electron band theory explaining why some materials conduct electricity",
  "How early humans selectively bred wolves over millennia into domestic dogs",
  "The cold chain logistics required to deliver fresh food to modern megacities",
  "How cooking food may have driven encephalization in human ancestors",
  "The condensation nuclei chemistry by which cloud droplets form around particles",
  "How the Enigma encryption machine worked and how it was defeated",
  "Why humans are one of the only mammals that produce emotional tears",
  "How the invention of writing transformed law, commerce, and memory",
  "The precession of a spinning gyroscope and why it puzzled physicists for centuries",
  "How urban street grid design determines the walkability of entire neighborhoods",
  "How seawater salinity affects the freezing and melting point of ice",
  "The chemical signaling between injured plants that alerts neighboring plants",
  "How some deep-sea fish produce their own bioluminescent light in total darkness",
  "The mechanics of how a tornado forms from a rotating supercell thunderstorm",
  "How the discovery of perspective drawing transformed European visual art",
  "The cognitive science behind why humans find faces in random patterns",
  "How ancient Mesopotamians developed the sexagesimal counting system still used for time",
  "The biochemistry of how venom disrupts the human nervous and circulatory system",
  "How synthetic dyes were accidentally discovered from coal tar in the 19th century",
  "The fluid dynamics explaining why rivers always curve and meander",
  "How medieval Islamic scholars preserved and advanced Greek mathematics",
  "The biology of how migratory whales navigate across entire ocean basins",
  "How the first written legal codes transformed power from rulers to law",
  "The structural chemistry that makes spider silk stronger than steel by weight",
];

const BENCHMARKS = [
  { label: "Slow", range: "< 110 WPM" },
  { label: "Average", range: "120–150 WPM" },
  { label: "Good", range: "150–170 WPM" },
  { label: "Fast", range: "170–200 WPM" },
  { label: "Very fast", range: "200+ WPM" },
];

function getBenchmark(w: number) {
  if (w < 110) return { label: "Slow paced", color: "#e24b4a", bg: "#fcebeb", desc: "Most speakers hit 120–150 WPM. Keep practicing!" };
  if (w < 130) return { label: "Below average", color: "#ba7517", bg: "#faeeda", desc: "You're getting there — average is 130–150 WPM." };
  if (w < 155) return { label: "Average speaker", color: "#639922", bg: "#eaf3de", desc: "Right in the conversational sweet spot." };
  if (w < 175) return { label: "Confident speaker", color: "#185fa5", bg: "#e6f1fb", desc: "Podcast hosts typically speak at 150–165 WPM." };
  if (w < 210) return { label: "Fast speaker", color: "#0f6e56", bg: "#e1f5ee", desc: "Energetic and engaging — well above average." };
  return { label: "Very fast!", color: "#534ab7", bg: "#eeedfe", desc: "At this pace, focus on clarity and articulation." };
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function norm(w: string) { return w.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function findLastSpokenWord(passageWords: string[], transcript: string) {
  if (!transcript || !transcript.trim()) return -1;
  const pNorm = passageWords.map(norm);
  const tNorm = transcript.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
  let pi = 0;
  for (let ti = 0; ti < tNorm.length && pi < pNorm.length; ti++) {
    for (let la = 0; la < 4 && pi + la < pNorm.length; la++) {
      if (pNorm[pi + la] === tNorm[ti]) { pi = pi + la + 1; break; }
    }
  }
  return pi - 1;
}

const usedIndices = new Set();

function pickTopic() {
  if (usedIndices.size >= TOPICS.length) usedIndices.clear();
  let idx;
  do { idx = Math.floor(Math.random() * TOPICS.length); } while (usedIndices.has(idx));
  usedIndices.add(idx);
  return TOPICS[idx];
}

export default function SpeakingSpeedApp() {
  const [screen, setScreen] = useState("setup");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState(1);
  const [passage, setPassage] = useState("");
  const [words, setWords] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [currentTopic, setCurrentTopic] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [hoveredWord, setHoveredWord] = useState(-1);
  const [selectedWord, setSelectedWord] = useState(-1);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micStatus, setMicStatus] = useState("idle");
  const [micDetectedWord, setMicDetectedWord] = useState(-1);
  const [error, setError] = useState("");

  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const animRef = useRef(null);
  const startRef = useRef(null);
  const wordsRef = useRef([]);
  const finishedRef = useRef(false);
  const durationRef = useRef(1);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const finalRef = useRef("");

  const hasSpeechAPI = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  const generatePassage = async () => {
    setError("");
    setScreen("loading");
    durationRef.current = duration;
    const topic = pickTopic();
    setCurrentTopic(topic);
    const level = difficulty === "medium"
      ? "clear, engaging, medium-level English suitable for a general audience"
      : "sophisticated, advanced English with elevated vocabulary suitable for an educated audience";
    const prompt = `Write a single 330-word passage specifically about: "${topic}". Write in ${level}. Do not use the topic as a title. Do not use bullet points or section breaks. Write one flowing, informative passage about that exact topic only.`;

    try {
      const res = await fetch("/api/generate-passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = (data?.content?.[0]?.text || "").trim();
      const w = text.split(/\s+/);
      wordsRef.current = w;
      setPassage(text); setWords(w); setWordCount(w.length);
      setTimeLeft(duration * 60);
      finishedRef.current = false;
      setSelectedWord(-1); setHoveredWord(-1); setMicDetectedWord(-1);
      setScreen("ready");
    } catch {
      setError("Could not generate passage. Please try again.");
      setScreen("setup");
    }
  };

  const startReading = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    transcriptRef.current = ""; finalRef.current = "";
    setScreen("reading");
  };

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    const elapsed = Math.min((Date.now() - startRef.current) / 1000, durationRef.current * 60);
    setElapsedSecs(Math.round(elapsed));
    const detected = findLastSpokenWord(wordsRef.current, transcriptRef.current);
    setMicDetectedWord(detected);
    setSelectedWord(detected >= 0 ? detected : -1);
    setHoveredWord(-1); setMicStatus("idle");
    setScreen("click-word");
  };

  useEffect(() => {
    if (screen !== "reading") return;
    startRef.current = Date.now();
    const totalMs = durationRef.current * 60 * 1000;

    if (micEnabled && hasSpeechAPI) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      try {
        const rec = new SR();
        rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
        rec.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + " ";
          }
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (!e.results[i].isFinal) interim += e.results[i][0].transcript;
          }
          transcriptRef.current = finalRef.current + interim;
        };
        rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") setMicStatus("error"); };
        rec.onend = () => { if (!finishedRef.current) { try { rec.start(); } catch (e) {} } };
        rec.start();
        recognitionRef.current = rec;
        setMicStatus("active");
      } catch (e) { setMicStatus("error"); }
    }

    timerRef.current = setInterval(() => {
      if (finishedRef.current) return;
      const elapsed = (Date.now() - startRef.current) / 1000;
      const rem = Math.max(0, durationRef.current * 60 - elapsed);
      setTimeLeft(Math.ceil(rem));
      if (rem <= 0) handleFinish();
    }, 200);

    const tid = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      let last = null;
      const tick = (ts) => {
        if (finishedRef.current) return;
        if (!last) last = ts;
        const dt = ts - last; last = ts;
        el.scrollTop = Math.min(el.scrollTop + (scrollable * dt / totalMs), scrollable);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    }, 150);

    return () => {
      clearInterval(timerRef.current); cancelAnimationFrame(animRef.current); clearTimeout(tid);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      setMicStatus("idle");
    };
  }, [screen]);

  const confirmWord = () => {
    if (selectedWord < 0) return;
    setWpm(Math.round((selectedWord + 1) / (elapsedSecs / 60)));
    setScreen("results");
  };

  const reset = () => {
    setPassage(""); setWords([]); setWordCount(0); setWpm(0);
    setMicDetectedWord(-1); setCurrentTopic("");
    finishedRef.current = false; setScreen("setup");
  };

  const pct = (timeLeft / (durationRef.current * 60)) * 100;
  const bm = getBenchmark(wpm);

  const card = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "28px" };
  const purpleBtn = { width: "100%", padding: "14px", borderRadius: "var(--border-radius-md)", border: "none", background: "#534ab7", color: "#fff", fontSize: "15px", fontWeight: 500, cursor: "pointer" };

  if (screen === "setup") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px", lineHeight: 1 }}>🎙️</div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 500, color: "var(--color-text-primary)" }}>Speaking speed test</h1>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "15px" }}>Find out how many words per minute you speak</p>
        </div>
        {error && <p style={{ color: "var(--color-text-danger)", textAlign: "center", fontSize: "14px", marginBottom: "16px" }}>{error}</p>}
        <div style={card}>
          <div style={{ marginBottom: "24px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Passage difficulty</p>
            <div style={{ display: "flex", gap: "10px" }}>
              {["medium", "advanced"].map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{ flex: 1, padding: "12px", borderRadius: "var(--border-radius-md)", border: difficulty === d ? "2px solid #534ab7" : "0.5px solid var(--color-border-tertiary)", background: difficulty === d ? "#eeedfe" : "var(--color-background-secondary)", color: difficulty === d ? "#534ab7" : "var(--color-text-secondary)", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                  {d === "medium" ? "📖 Medium" : "📚 Advanced"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "24px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Speaking duration</p>
            <div style={{ display: "flex", gap: "10px" }}>
              {[1, 2].map(d => (
                <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: "12px", borderRadius: "var(--border-radius-md)", border: duration === d ? "2px solid #534ab7" : "0.5px solid var(--color-border-tertiary)", background: duration === d ? "#eeedfe" : "var(--color-background-secondary)", color: duration === d ? "#534ab7" : "var(--color-text-secondary)", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                  {d} Minute{d > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "16px 0", borderTop: "0.5px solid var(--color-border-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" }}>Use microphone</p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{hasSpeechAPI ? "Auto-detect your last spoken word" : "Not supported — use Chrome or Edge"}</p>
              </div>
              <div onClick={() => hasSpeechAPI && setMicEnabled(v => !v)} style={{ width: "44px", height: "24px", borderRadius: "99px", background: micEnabled && hasSpeechAPI ? "#534ab7" : "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", cursor: hasSpeechAPI ? "pointer" : "not-allowed", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: "3px", left: micEnabled && hasSpeechAPI ? "23px" : "3px", width: "17px", height: "17px", borderRadius: "50%", background: "#fff", border: "0.5px solid var(--color-border-tertiary)", transition: "left 0.2s" }} />
              </div>
            </div>
          </div>
          <button onClick={generatePassage} style={purpleBtn}>Generate passage →</button>
        </div>
      </div>
    </div>
  );

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <div style={{ textAlign: "center", maxWidth: "400px", padding: "24px" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px", lineHeight: 1 }}>✍️</div>
        <p style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 500, color: "var(--color-text-primary)" }}>Generating your passage...</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>Topic: <span style={{ fontStyle: "italic", color: "var(--color-text-primary)" }}>{currentTopic}</span></p>
      </div>
    </div>
  );

  if (screen === "ready") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-background-primary)", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", fontSize: "12px", fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Topic</p>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.4 }}>{currentTopic}</p>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", flexShrink: 0, textAlign: "right", lineHeight: 1.8 }}>
            <span>{wordCount} words</span><br />
            <span>{difficulty} · {durationRef.current} min</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <p style={{ fontSize: "21px", lineHeight: 1.9, margin: "0 auto", color: "var(--color-text-primary)", maxWidth: "640px" }}>{passage}</p>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        {micEnabled && hasSpeechAPI && <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)", flex: 1 }}>🎙️ Microphone will activate on start</p>}
        <button onClick={startReading} style={{ ...purpleBtn, maxWidth: "200px", margin: 0, flex: "none" }}>Start timer →</button>
      </div>
    </div>
  );

  if (screen === "reading") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-background-primary)", overflow: "hidden" }}>
      <style>{`@keyframes micPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{ padding: "14px 24px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time left</span>
            {micStatus === "active" && <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#0f6e56" }}><span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#1d9e75", animation: "micPulse 1.4s ease-in-out infinite" }} />Listening</span>}
            {micStatus === "error" && <span style={{ fontSize: "12px", color: "#e24b4a" }}>Mic denied</span>}
          </div>
          <span style={{ fontSize: "30px", fontWeight: 500, color: "#534ab7", fontVariantNumeric: "tabular-nums" }}>{fmt(timeLeft)}</span>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "99px", height: "5px", overflow: "hidden", marginBottom: "8px" }}>
          <div style={{ background: "#534ab7", height: "100%", width: `${pct}%`, borderRadius: "99px", transition: "width 0.2s linear" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-tertiary)" }}>
          <span style={{ maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentTopic}</span>
          <span>{wordCount} words</span>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "scroll", padding: "32px 40px", scrollbarWidth: "none" }}>
        <p style={{ fontSize: "21px", lineHeight: 1.9, margin: "0 auto", color: "var(--color-text-primary)", maxWidth: "640px" }}>{passage}</p>
        <div style={{ height: "240px" }} />
      </div>
      <div style={{ padding: "14px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <button onClick={handleFinish} style={{ padding: "10px 28px", borderRadius: "99px", border: "0.5px solid #e24b4a", background: "transparent", color: "#e24b4a", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Stop early</button>
      </div>
    </div>
  );

  if (screen === "click-word") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-background-primary)", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <p style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)" }}>{micDetectedWord >= 0 ? "Microphone detected your last word" : "Where did you stop?"}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>{micDetectedWord >= 0 ? `Stopped at word ${micDetectedWord + 1} — click any word to adjust if needed` : "Click the last word you spoke aloud"}</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
        <div style={{ fontSize: "21px", lineHeight: 2.2, maxWidth: "640px", margin: "0 auto", userSelect: "none" }}>
          {words.map((word, i) => {
            const isSel = i === selectedWord, isBefore = selectedWord >= 0 && i < selectedWord, isHov = hoveredWord >= 0 && i <= hoveredWord && selectedWord < 0;
            return (
              <span key={i} onMouseEnter={() => { if (selectedWord < 0) setHoveredWord(i); }} onMouseLeave={() => { if (selectedWord < 0) setHoveredWord(-1); }} onClick={() => { setSelectedWord(i); setHoveredWord(-1); }} style={{ display: "inline-block", borderRadius: "4px", padding: "0 3px", margin: "0 1px", cursor: "pointer", transition: "background 0.1s", background: isSel ? "#534ab7" : isBefore ? "#eeedfe" : isHov ? "var(--color-background-secondary)" : "transparent", color: isSel ? "#fff" : isBefore ? "#534ab7" : "var(--color-text-primary)", fontWeight: isSel ? 500 : 400 }}>{word}</span>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "14px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
        {selectedWord >= 0
          ? <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)", flex: 1 }}><span style={{ fontWeight: 500, color: "#534ab7" }}>{selectedWord + 1} words</span> · {fmt(elapsedSecs)} elapsed{micDetectedWord >= 0 && selectedWord !== micDetectedWord && <span style={{ color: "var(--color-text-tertiary)" }}> · adjusted</span>}</p>
          : <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-tertiary)", flex: 1 }}>Hover to preview · click to select</p>}
        <button onClick={confirmWord} disabled={selectedWord < 0} style={{ padding: "10px 24px", borderRadius: "var(--border-radius-md)", border: "none", background: selectedWord >= 0 ? "#534ab7" : "var(--color-background-secondary)", color: selectedWord >= 0 ? "#fff" : "var(--color-text-tertiary)", fontSize: "14px", fontWeight: 500, cursor: selectedWord >= 0 ? "pointer" : "default", flexShrink: 0 }}>Confirm →</button>
      </div>
    </div>
  );

  if (screen === "results") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 500, color: "var(--color-text-primary)" }}>Your results</h2>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "14px" }}>{difficulty} level · {fmt(elapsedSecs)} recorded</p>
        </div>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "72px", fontWeight: 500, lineHeight: 1, color: bm.color }}>{wpm}</div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "4px" }}>words per minute</div>
          </div>
          <div style={{ background: bm.bg, borderRadius: "var(--border-radius-md)", padding: "14px 16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "15px", fontWeight: 500, color: bm.color, marginBottom: "3px" }}>{bm.label}</div>
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{bm.desc}</div>
          </div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", marginBottom: "16px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Topic</p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-primary)", lineHeight: 1.5 }}>{currentTopic}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            {[{ val: selectedWord + 1, lbl: "Words spoken" }, { val: fmt(elapsedSecs), lbl: "Time taken" }, { val: difficulty, lbl: "Difficulty" }].map(s => (
              <div key={s.lbl} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "17px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "3px" }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "16px", marginBottom: "20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>WPM benchmarks</p>
            {BENCHMARKS.map(b => (
              <div key={b.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{b.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#534ab7" }}>{b.range}</span>
              </div>
            ))}
          </div>
          <button onClick={reset} style={purpleBtn}>Try again</button>
        </div>
      </div>
    </div>
  );
}