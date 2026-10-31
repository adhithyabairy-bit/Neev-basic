/**
 * Generates genuine, compliant PDF 1.4 documents for NCERT Social Studies chapters (Class 6 - 10)
 * and saves them directly to frontend/public/curriculum/.
 */
const fs = require('fs');
const path = require('path');

function escapePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[^\x20-\x7E\t]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function wrapText(text, maxChars = 75) {
  if (!text) return [];
  const words = String(text).replace(/[^\x20-\x7E\t]/g, '').split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function buildPdfBuffer(pagesItems = []) {
  if (!pagesItems || pagesItems.length === 0) {
    pagesItems = [[]];
  }

  const numPages = pagesItems.length;
  const kids = [];
  for (let i = 0; i < numPages; i++) {
    const pageObjNum = 5 + 2 * i;
    kids.push(`${pageObjNum} 0 R`);
  }

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>\nendobj\n`;
  const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const pageObjects = [];
  const contentObjects = [];

  for (let i = 0; i < numPages; i++) {
    const pageObjNum = 5 + 2 * i;
    const streamObjNum = 6 + 2 * i;
    const items = pagesItems[i] || [];

    let streamContent = 'BT\n';
    items.forEach((item) => {
      const font = item.font || 'F1';
      const size = item.size || 10;
      const safeText = escapePdfText(item.text);
      streamContent += `/${font} ${size} Tf\n`;
      streamContent += `1 0 0 1 ${item.x} ${item.y} Tm\n`;
      streamContent += `(${safeText}) Tj\n`;
    });
    streamContent += 'ET\n';

    const streamLength = streamContent.length;
    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjNum} 0 R >>\nendobj\n`;
    const streamObj = `${streamObjNum} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;

    pageObjects.push(pageObj);
    contentObjects.push(streamObj);
  }

  const header = '%PDF-1.4\n';
  const objects = [obj1, obj2, obj3, obj4];
  for (let i = 0; i < numPages; i++) {
    objects.push(pageObjects[i]);
    objects.push(contentObjects[i]);
  }

  const totalObjs = objects.length;
  const offsets = [];
  let currentOffset = header.length;

  for (let i = 0; i < totalObjs; i++) {
    offsets.push(currentOffset);
    currentOffset += objects[i].length;
  }

  const xrefOffset = currentOffset;
  const pad = (num) => String(num).padStart(10, '0');

  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < totalObjs; i++) {
    xref += `${pad(offsets[i])} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const fullPdf = header + objects.join('') + xref + trailer;
  return Buffer.from(fullPdf, 'latin1');
}

function createChapterPdf(chapterMeta) {
  const pages = [];
  let currentPage = [];
  let y = 800;

  function addPage() {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    currentPage = [];
    y = 800;
  }

  // Header Banner
  currentPage.push({ text: 'NCERT CURRICULUM STUDY MATERIAL - NEEV PLATFORM', x: 50, y, size: 8, font: 'F1' });
  y -= 25;
  currentPage.push({ text: chapterMeta.title, x: 50, y, size: 16, font: 'F2' });
  y -= 18;
  currentPage.push({ text: `${chapterMeta.grade} - ${chapterMeta.subject} | Unit: ${chapterMeta.unit}`, x: 50, y, size: 11, font: 'F1' });
  y -= 25;

  // Chapter Overview
  currentPage.push({ text: 'CHAPTER OVERVIEW & CORE FOUNDATIONAL CONCEPTS', x: 50, y, size: 12, font: 'F2' });
  y -= 16;
  const overviewLines = wrapText(chapterMeta.overview, 75);
  overviewLines.forEach((line) => {
    currentPage.push({ text: line, x: 50, y, size: 10, font: 'F1' });
    y -= 14;
  });
  y -= 15;

  // Key Learning Objectives
  currentPage.push({ text: 'KEY LEARNING OBJECTIVES', x: 50, y, size: 12, font: 'F2' });
  y -= 16;
  (chapterMeta.objectives || []).forEach((obj, idx) => {
    const objLines = wrapText(`${idx + 1}. ${obj}`, 72);
    objLines.forEach((line) => {
      currentPage.push({ text: line, x: 50, y, size: 10, font: 'F1' });
      y -= 14;
    });
  });
  y -= 15;

  // Key Topics and Detailed Notes
  (chapterMeta.sections || []).forEach((sec) => {
    if (y < 160) {
      addPage();
    }
    currentPage.push({ text: sec.heading.toUpperCase(), x: 50, y, size: 11, font: 'F2' });
    y -= 16;
    const secLines = wrapText(sec.content, 75);
    secLines.forEach((line) => {
      currentPage.push({ text: line, x: 50, y, size: 9.5, font: 'F1' });
      y -= 13;
    });
    y -= 12;
  });

  // Diagnostic Focus & Remediation Guidelines
  if (y < 160) {
    addPage();
  }
  currentPage.push({ text: 'DIAGNOSTIC FOCUS & COMMON MISCONCEPTIONS', x: 50, y, size: 12, font: 'F2' });
  y -= 16;
  const diagLines = wrapText(chapterMeta.diagnosticFocus, 75);
  diagLines.forEach((line) => {
    currentPage.push({ text: line, x: 50, y, size: 9.5, font: 'F1' });
    y -= 13;
  });
  y -= 20;

  // Practice & Verification Questions
  currentPage.push({ text: 'PREREQUISITE REINFORCEMENT QUESTIONS', x: 50, y, size: 11, font: 'F2' });
  y -= 16;
  (chapterMeta.questions || []).forEach((q, idx) => {
    if (y < 80) addPage();
    currentPage.push({ text: `Q${idx + 1}: ${q.prompt}`, x: 50, y, size: 9.5, font: 'F2' });
    y -= 14;
    const ansLines = wrapText(`Expected Answer: ${q.answer}`, 72);
    ansLines.forEach((line) => {
      currentPage.push({ text: line, x: 60, y, size: 9, font: 'F1' });
      y -= 12;
    });
    y -= 6;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return buildPdfBuffer(pages);
}

const chapters = [
  {
    fileName: 'Class 6 Social Studies Chapter 1.pdf',
    grade: 'Class 6',
    subject: 'Social Science',
    unit: 'The Earth: Our Habitat (Geography)',
    title: 'Chapter 1: The Earth in the Solar System & Understanding Maps',
    overview: 'This foundational chapter introduces students to spatial representations, celestial bodies, and the essential components of maps including distance, direction, and symbols.',
    objectives: [
      'Understand the celestial hierarchy: Sun, planets, satellites, and asteroids in our solar system.',
      'Differentiate between physical, political, and thematic maps.',
      'Master the three map essentials: scale (distance ratio), cardinal directions, and conventional symbols.',
      'Interpret grid coordinates using lines of latitude (parallels) and longitude (meridians).'
    ],
    sections: [
      {
        heading: '1. Map Scale & Distance Conversion',
        content: 'Scale is the ratio between the actual distance on the ground and the distance shown on the map. Small scale maps (e.g. 1 cm = 500 km) represent large landmasses like continents. Large scale maps (e.g. 1 cm = 50 m) reveal detailed local topography like villages or guide maps.'
      },
      {
        heading: '2. Cardinal Directions and Compass Orientation',
        content: 'Maps traditionally orient North towards the top edge. The four major directions - North, South, East, West - are cardinal points. Intermediate directions include North-East (NE), South-East (SE), South-West (SW), and North-West (NW).'
      }
    ],
    diagnosticFocus: 'Students frequently confuse small-scale and large-scale ratios, mistakenly assuming that a small scale map shows smaller objects with higher detail rather than vast geographical areas.',
    questions: [
      { prompt: 'What are the three essential components of a map?', answer: 'The three essential components are distance (scale), direction (cardinal points), and conventional symbols.' },
      { prompt: 'Why is a globe less convenient than a flat map for studying a single district?', answer: 'A globe represents the whole Earth and cannot be folded or provide high-resolution local details like roads and villages.' }
    ]
  },
  {
    fileName: 'Class 6 Social Studies Chapter 2.pdf',
    grade: 'Class 6',
    subject: 'Social Science',
    unit: 'Our Pasts - I (History)',
    title: 'Chapter 2: History & Early Human Societies',
    overview: 'Explores the timeline of human civilization from hunting-gathering to settled agrarian communities along major river basins.',
    objectives: [
      'Understand chronology: the transition between BCE (Before Common Era) and CE (Common Era).',
      'Examine archaeological evidence: stone tools, cave paintings, and habitation-cum-factory sites.',
      'Trace the dawn of farming and herding at Mehrgarh near the Bolan Pass.'
    ],
    sections: [
      {
        heading: '1. Historical Chronology & Time Measurement',
        content: 'Historical events are dated relative to the birth of Jesus Christ. Years before 1 CE are counted backwards as BCE. Dates after are marked CE or AD. Understanding time direction is vital for historical causality.'
      },
      {
        heading: '2. Transition to Sedentary Agrarian Life',
        content: 'Around 10,000 to 12,000 years ago, climate warming led to grasslands development. Humans began domesticating barley, wheat, sheep, and cattle, settling in pit-houses with storage pots.'
      }
    ],
    diagnosticFocus: 'Common student slips include calculating elapsed time across the BCE/CE boundary by subtracting rather than adding elapsed centuries.',
    questions: [
      { prompt: 'How do archaeologists determine the occupation of hunter-gatherer sites?', answer: 'Through unearthed stone tools, animal bones, charred grain seeds, and cave paintings depicting hunting scenes.' },
      { prompt: 'What is the significance of Mehrgarh in the history of the Indian subcontinent?', answer: 'It is one of the earliest known sites where human communities cultivated barley and wheat and domesticated animals around 8000 years ago.' }
    ]
  },
  {
    fileName: 'Class 6 Social Studies Chapter 3.pdf',
    grade: 'Class 6',
    subject: 'Social Science',
    unit: 'Social and Political Life - I (Civics)',
    title: 'Chapter 3: Democratic Governance & Civic Institutions',
    overview: 'Introduces the necessity of rules, institutional authority, levels of government, and fundamental democratic ideals.',
    objectives: [
      'Define government and identify its three tiers: local (Panchayat/Municipality), state, and national.',
      'Contrast democratic systems with monarchies and authoritarian regimes.',
      'Understand Universal Adult Suffrage and equal voting rights regardless of wealth, gender, or caste.'
    ],
    sections: [
      {
        heading: '1. Levels of Government & Rule of Law',
        content: 'The government makes laws for the entire nation and enforces compliance. Laws ensure peaceful coexistence, fair commerce, and safety. In India, governance operates at three tiers: local, state, and central national level.'
      },
      {
        heading: '2. Democratic Participation & Equality',
        content: 'In a democracy, ultimate sovereignty rests with the citizens who elect representatives through free, regular elections based on Universal Adult Franchise: one person, one vote, one value.'
      }
    ],
    diagnosticFocus: 'Students often confuse the distinct operational jurisdictions of municipal councils (local roads, sanitation) with state governments (police, state education) and national bodies (defense, foreign affairs).',
    questions: [
      { prompt: 'What does Universal Adult Suffrage mean in Indian democracy?', answer: 'It means that all adult citizens aged 18 and above have the right to vote equally in elections, regardless of wealth, caste, religion, or gender.' },
      { prompt: 'Name the three tiers of government functioning in India.', answer: '1. Local government (Panchayat / Municipality), 2. State government, 3. National / Central government.' }
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 1.pdf',
    grade: 'Class 7',
    subject: 'Social Science',
    unit: 'Social and Political Life - II (Civics)',
    title: 'Chapter 1: The Indian Constitution & Democratic Institutions',
    overview: 'Examines the fundamental legal framework governing the Republic of India, the Preamble, and constitutional mechanisms ensuring equality and fundamental rights.',
    objectives: [
      'Analyze the core principles enshrined in the Preamble: Sovereign, Socialist, Secular, Democratic, Republic.',
      'Understand the separation of powers: Legislature, Executive, and Judiciary.',
      'Explore Article 15 and constitutional guarantees against discrimination on grounds of religion, race, caste, sex, or place of birth.'
    ],
    sections: [
      {
        heading: '1. The Preamble as the Guiding Spirit of the Constitution',
        content: 'The Preamble serves as the constitutional introduction outlining fundamental values: justice (social, economic, political), liberty of thought, equality of status and opportunity, and fraternity assuring the dignity of the individual.'
      },
      {
        heading: '2. Institutional Separation of Powers',
        content: 'Power is divided among three branches: Legislature (law-making parliament), Executive (implementation by ministers and civil servants), and Judiciary (independent courts interpreting law and settling disputes) to prevent abuse of authority.'
      }
    ],
    diagnosticFocus: 'Students frequently mix up the functions of the Legislature (passing acts) and the Executive (implementing administrative policies), or overlook the constitutional role of judicial review.',
    questions: [
      { prompt: 'State two constitutional provisions in Article 15 aimed at establishing equality in India.', answer: '1. Prohibition of state discrimination against any citizen on grounds only of religion, race, caste, sex, or place of birth. 2. Equal access to public shops, restaurants, wells, and tanks.' },
      { prompt: 'Why is an independent judiciary essential in a democratic nation?', answer: 'To ensure impartial interpretation of constitutional law and protect citizen fundamental rights from executive or legislative overreach.' }
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 2.pdf',
    grade: 'Class 7',
    subject: 'Social Science',
    unit: 'Our Environment (Geography)',
    title: 'Chapter 2: Natural Resources: Land, Water, Air and Conservation',
    overview: 'Investigates Earth ecological domains - lithosphere, hydrosphere, atmosphere, and biosphere - and sustainable resource management.',
    objectives: [
      'Examine the components of natural, human, and human-made environments.',
      'Understand the hydrological cycle and global freshwater distribution.',
      'Evaluate factors contributing to environmental degradation and practical conservation strategies.'
    ],
    sections: [
      {
        heading: '1. Earth Spheres and Ecosystem Balance',
        content: 'The lithosphere is the solid crust of rocks and minerals. The hydrosphere encompasses water bodies. The atmosphere is the thin protective gaseous blanket held by gravity. The narrow zone where life exists is the biosphere.'
      },
      {
        heading: '2. Freshwater Scarcity and Conservation Measures',
        content: 'While Earth is 71 percent water, less than 3 percent is fresh, with most locked in polar glaciers. Conservation practices include rainwater harvesting, drip irrigation in agriculture, and industrial effluent treatment.'
      }
    ],
    diagnosticFocus: 'Students often overlook that freshwater distribution is finite and assume surface water runoff replenishment is instantaneous regardless of deforestation and soil erosion.',
    questions: [
      { prompt: 'Define an ecosystem and give one example of human intervention disrupting it.', answer: 'An ecosystem is a community of living organisms interacting with their physical environment; deforestation for urban expansion disrupts nutrient and rainfall cycles.' },
      { prompt: 'Explain the working principle of rainwater harvesting.', answer: 'Collecting and filtering rainwater runoff from rooftops and open surfaces into storage tanks or borewells to recharge groundwater aquifers.' }
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 3.pdf',
    grade: 'Class 7',
    subject: 'Social Science',
    unit: 'Our Pasts - II (History)',
    title: 'Chapter 3: Medieval India: The Delhi Sultanate & The Mughal Empire',
    overview: 'Studies medieval statecraft, military campaigns, administrative hierarchies, and cultural synthesis in North and Central India.',
    objectives: [
      'Trace administrative innovations from the Iqtadari system of the Sultanate to the Mansabdari system of Akbar.',
      'Analyze the Zabt revenue assessment system formulated by Raja Todar Mal.',
      'Understand the socio-cultural policy of Sulh-i-kul (universal peace and tolerance).'
    ],
    sections: [
      {
        heading: '1. The Mansabdari System & Military Organization',
        content: 'Mansabdars were military officers holding graded ranks (mansabs) determining civil status, salary, and cavalry quota (sawars). Salaries were disbursed through revenue assignments called jagirs.'
      },
      {
        heading: '2. Agrarian Revenue Policy: Zabt and Todar Mal Reforms',
        content: 'Raja Todar Mal surveyed crop yields, prices, and cultivated areas over a 10-year period (1570-1580), setting cash tax rates per crop to stabilize state revenues and farmer obligations.'
      }
    ],
    diagnosticFocus: 'Confusing hereditary fiefdoms with non-hereditary Mughal jagirs; students frequently assume mansabdars owned the assigned land rather than collecting assigned state revenues.',
    questions: [
      { prompt: 'What was the difference between a mansabdar rank (zat) and cavalry obligation (sawar)?', answer: 'Zat determined the personal noble standing and salary of the mansabdar; sawar indicated the specific number of cavalrymen he was required to maintain.' },
      { prompt: 'What was the concept of Sulh-i-kul introduced by Emperor Akbar?', answer: 'A governance philosophy of universal peace and religious tolerance that emphasized justice, ethics, and non-discrimination across diverse faiths.' }
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 1.pdf',
    grade: 'Class 8',
    subject: 'Social Science',
    unit: 'Our Pasts - III (History)',
    title: 'Chapter 1: Colonial Rule & The Indian Freedom Movement (Revolt of 1857)',
    overview: 'Chronicles the commercial expansion of the British East India Company, colonial economic exploitation, and the nationwide uprising of 1857.',
    objectives: [
      'Analyze how the East India Company transitioned from trading enterprise to political ruling power.',
      'Examine the multi-dimensional causes of the Revolt of 1857: political annexations (Doctrine of Lapse), economic ruin of artisans, and religious grievances.',
      'Understand the aftermath: termination of Company rule and transfer of power to the British Crown in 1858.'
    ],
    sections: [
      {
        heading: '1. Causes of the 1857 Uprising',
        content: 'The uprising arose from widespread unrest: the Doctrine of Lapse annexed states like Jhansi and Satara; excessive land revenue ruined peasants; sepoys faced discriminatory pay and greased cartridge ammunition insulting religious beliefs.'
      },
      {
        heading: '2. Post-1857 Administrative Structural Changes',
        content: 'The Government of India Act 1858 placed India under direct authority of the British Crown represented by the Viceroy and Secretary of State for India, ending the East India Company monopoly.'
      }
    ],
    diagnosticFocus: 'Students often identify the greased cartridges as the sole cause of 1857, ignoring deep-rooted economic disaffection, peasant displacement, and political annexation policies.',
    questions: [
      { prompt: 'Name two significant consequences of the Revolt of 1857 on British governance in India.', answer: '1. Rule of the East India Company ended and direct sovereignty was assumed by the British Crown. 2. The Governor-General was designated Viceroy of India.' },
      { prompt: 'What was Lord Dalhousie Doctrine of Lapse and how did it create resentment?', answer: 'It decreed that any princely state without a natural male heir would be annexed by the British, depriving adopted heirs of succession in states like Jhansi and Satara.' }
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 2.pdf',
    grade: 'Class 8',
    subject: 'Social Science',
    unit: 'Resources and Development (Geography & Economics)',
    title: 'Chapter 2: Economic Activities, Sectors & Resource Management',
    overview: 'Examines economic classification into primary, secondary, and tertiary sectors alongside land use patterns, soils, and sustainable development.',
    objectives: [
      'Distinguish between primary (agriculture, mining), secondary (manufacturing), and tertiary (services) sectors.',
      'Understand soil profile layers and soil conservation techniques (contour plowing, terrace farming, shelterbelts).',
      'Analyze factors influencing agricultural crop patterns: climate, topography, soil fertility, and technology.'
    ],
    sections: [
      {
        heading: '1. Sectors of the Economy',
        content: 'Primary activities directly extract natural resources (farming, fishing). Secondary activities process raw materials into manufactured finished goods (weaving cotton into textiles). Tertiary activities provide services supporting production and trade (transport, banking, healthcare).'
      },
      {
        heading: '2. Soil Degradation and Scientific Conservation',
        content: 'Overgrazing, deforestation, chemical fertilizers, and rain-wash cause soil erosion. Conservation methods include terrace farming on mountain slopes, contour bunding to retard water runoff, and planting tree shelterbelts in dry regions.'
      }
    ],
    diagnosticFocus: 'Students frequently struggle to categorize hybrid economic tasks, such as classifying food packaging or agricultural grain transport into secondary versus tertiary sectors.',
    questions: [
      { prompt: 'Differentiate between primary and secondary economic sectors with one example each.', answer: 'Primary sector involves natural resource extraction (e.g. wheat farming); secondary sector transforms raw commodities into manufactured goods (e.g. baking bread in a factory).' },
      { prompt: 'Explain how terrace farming prevents soil erosion in mountainous terrains.', answer: 'Broad flat steps or terraces cut into steep slopes reduce the velocity of surface water runoff, preserving topsoil from being washed away.' }
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 3.pdf',
    grade: 'Class 8',
    subject: 'Social Science',
    unit: 'Social and Political Life - III (Civics)',
    title: 'Chapter 3: The Indian Constitution, Secularism & The Judiciary',
    overview: 'Explores the structural features of the Constitution, secular principles, and the hierarchical court system protecting citizen rights.',
    objectives: [
      'Define secularism as the separation of state power from religious dominance.',
      'Understand the integrated judicial pyramid: Supreme Court, High Courts, and Subordinate / District Courts.',
      'Learn about Public Interest Litigation (PIL) mechanisms expanding judicial access to marginalized communities.'
    ],
    sections: [
      {
        heading: '1. Constitutional Secularism in India',
        content: 'Indian secularism ensures that no single religious group dominates others, the state does not enforce any specific faith, and individual citizens have freedom to practice, profess, and propagate their chosen faith.'
      },
      {
        heading: '2. The Structure of the Judicial System & PIL',
        content: 'India maintains an integrated judicial hierarchy where rulings of higher courts bind lower courts. Supreme Court of India is the apex constitutional protector. Any individual can file a Public Interest Litigation (PIL) to redress violation of rights.'
      }
    ],
    diagnosticFocus: 'Students often assume Indian secularism implies total indifference or hostility to religion, rather than principled distance and non-discrimination ensuring religious liberty.',
    questions: [
      { prompt: 'What is Public Interest Litigation (PIL) and why was it introduced?', answer: 'PIL is a legal mechanism introduced by the Supreme Court to allow any citizen or organization to approach the court on behalf of people whose fundamental rights are violated.' },
      { prompt: 'Explain the concept of an integrated judicial system in India.', answer: 'It means decisions made by higher courts (Supreme Court and High Courts) are strictly binding on all subordinate lower courts across the nation.' }
    ]
  },
  {
    fileName: 'Class 9 Social Studies Chapter 1.pdf',
    grade: 'Class 9',
    subject: 'Social Science',
    unit: 'Democratic Politics - I (Civics)',
    title: 'Chapter 1: Democratic Politics, Electoral Competition & Constitutional Design',
    overview: 'Analyzes democratic principles, electoral systems, constituent assemblies, and constitutional design in contemporary societies.',
    objectives: [
      'Examine the defining features of a democracy: free and fair elections, major decisions by elected leaders, rule of law.',
      'Contrast democratic systems with autocratic setups in Zimbabwe, Mexico, or historical Pakistan.',
      'Understand how the Indian Constituent Assembly formulated enduring foundational values.'
    ],
    sections: [
      {
        heading: '1. Essential Criteria of Democracy',
        content: 'Democracy requires that major national decisions are made by elected representatives; elections offer real political choice; voting is universal and equal; and governance operates within constitutional law and rights guarantees.'
      },
      {
        heading: '2. Role of the Constituent Assembly',
        content: 'The Indian Constituent Assembly comprised 299 members who debated and drafted the Constitution across nearly three years, creating a flexible yet resilient document accommodating immense regional and cultural diversity.'
      }
    ],
    diagnosticFocus: 'Assuming elections alone suffice to make a country democratic, overlooking essential requirements for judicial independence, free press, and minority protection.',
    questions: [
      { prompt: 'Why is holding elections not the sole sufficient condition for calling a government democratic?', answer: 'Elections must be genuinely free and competitive, where the ruling party has a real chance of losing, and government power is constrained by constitutional rights.' },
      { prompt: 'Mention two guiding values articulated in the philosophy of the Indian Constitution.', answer: '1. Sovereign democratic republic ensuring liberty and equality. 2. Fraternity promoting unity and the dignity of every citizen.' }
    ]
  },
  {
    fileName: 'Class 9 Social Studies Chapter 2.pdf',
    grade: 'Class 9',
    subject: 'Social Science',
    unit: 'Contemporary India - I (Geography)',
    title: 'Chapter 2: Physical Features of India & Natural Drainage Systems',
    overview: 'Explores India diverse geomorphology - Himalayan Mountains, Northern Plains, Peninsular Plateau, Coastal Plains - and major river drainage networks.',
    objectives: [
      'Understand the tectonic plate collision creating the young fold mountains of the Himalayas.',
      'Differentiate between perennial Himalayan river systems (Ganga, Indus, Brahmaputra) and rain-fed Peninsular rivers (Godavari, Krishna, Narmada).',
      'Analyze the economic significance of alluvial fertile soils in the Indo-Gangetic plains.'
    ],
    sections: [
      {
        heading: '1. Major Physiographic Divisions',
        content: 'India displays diverse relief: the young fold Himalayas, flat fertile Northern Alluvial Plains, ancient Gondwana Peninsular Plateau, the Thar Desert, coastal plains, and island archipelagos.'
      },
      {
        heading: '2. Himalayan vs Peninsular River Basins',
        content: 'Himalayan rivers are perennial, originating from snow glaciers, performing intense erosion, and forming large deltas. Peninsular rivers are seasonal, rain-dependent, flow in mature shallower valleys, and some form estuaries.'
      }
    ],
    diagnosticFocus: 'Students frequently fail to contrast perennial glacial river flows with seasonal peninsular regimes, confusing flooding risks and hydroelectric patterns.',
    questions: [
      { prompt: 'State two differences between Himalayan rivers and Peninsular rivers.', answer: '1. Himalayan rivers are perennial and fed by glaciers; Peninsular rivers are seasonal and dependent on monsoon rainfall. 2. Himalayan rivers have long courses with deep gorges; Peninsular rivers have shorter, gentler courses.' },
      { prompt: 'How were the Northern Plains of India formed geologically?', answer: 'By the continuous deposition of alluvial sediments brought down by the three Himalayan river systems: the Indus, the Ganga, and the Brahmaputra over millions of years.' }
    ]
  },
  {
    fileName: 'Class 10 Social Studies Chapter 1.pdf',
    grade: 'Class 10',
    subject: 'Social Science',
    unit: 'Contemporary India - II (Geography & Economics)',
    title: 'Chapter 1: Resources, Sustainable Development & Agriculture',
    overview: 'Investigates resource planning, sustainable utilization, cropping patterns, and institutional reforms in Indian agriculture for Board Examinations.',
    objectives: [
      'Analyze the concept of sustainable development articulated at the Rio Earth Summit 1992 and Agenda 21.',
      'Examine land use patterns and causes of land degradation in India.',
      'Contrast major cropping seasons: Kharif (monsoon crops), Rabi (winter crops), and Zaid (summer crops).'
    ],
    sections: [
      {
        heading: '1. Resource Planning and Sustainable Development',
        content: 'Resource planning involves identifying reserves through surveys and mapping, evolving appropriate technological infrastructure, and aligning regional development with overall national economic goals without ecological depletion.'
      },
      {
        heading: '2. Agricultural Seasons & Food Security',
        content: 'Kharif crops (rice, maize, cotton) are sown with monsoon arrival in June and harvested in autumn. Rabi crops (wheat, mustard, gram) are sown in winter (October-December) and harvested in spring. Commercial modernization requires institutional credit and crop insurance.'
      }
    ],
    diagnosticFocus: 'Confusing cropping seasons and moisture requirements; e.g. incorrectly labeling wheat as a Kharif monsoon crop rather than winter Rabi crop.',
    questions: [
      { prompt: 'Explain the three stages involved in resource planning in India.', answer: '1. Identification and inventory of resources across regions. 2. Designing a planning structure with appropriate technology and institutional setup. 3. Matching resource development plans with national development goals.' },
      { prompt: 'Differentiate between Kharif and Rabi agricultural seasons with two crop examples each.', answer: 'Kharif crops are sown with monsoons (June-July) and harvested in autumn (e.g. Paddy, Maize); Rabi crops are sown in winter (October-December) and harvested in spring (e.g. Wheat, Mustard).' }
    ]
  },
  {
    fileName: 'Class 10 Social Studies Chapter 2.pdf',
    grade: 'Class 10',
    subject: 'Social Science',
    unit: 'India and the Contemporary World - II (History)',
    title: 'Chapter 2: Nationalism in India & The Freedom Struggle (Board Exam Units)',
    overview: 'Examines the mass mobilization of the Indian national movement led by Mahatma Gandhi, the Non-Cooperation Movement, Civil Disobedience, and the creation of collective national identity.',
    objectives: [
      'Analyze the socio-economic impact of the First World War and the Rowlatt Act 1919.',
      'Trace the trajectory of the Non-Cooperation Movement and its suspension after Chauri Chaura in 1922.',
      'Examine the Salt Satyagraha, Civil Disobedience Movement, and the role of women, peasants, and tribal communities.'
    ],
    sections: [
      {
        heading: '1. Satyagraha and Mass Mobilization',
        content: 'Satyagraha emphasized the power of truth and non-violence. Gandhi deployed it in Champaran (indigo farmers), Kheda (crop failure revenue relief), and Ahmedabad (cotton mill workers) before launching nationwide movements against the Rowlatt Act.'
      },
      {
        heading: '2. The Civil Disobedience Movement & Salt March',
        content: 'In 1930, Gandhi marched 240 miles from Sabarmati to Dandi to manufacture salt from seawater, defying the oppressive British salt tax monopoly. The movement encouraged widespread boycott of foreign cloth, refusal of land revenue, and peaceful picketing.'
      }
    ],
    diagnosticFocus: 'Students often confuse the Non-Cooperation Movement (refusal of cooperation without deliberate law violation) with the Civil Disobedience Movement (active defiance and breaking of colonial laws like the Salt Act).',
    questions: [
      { prompt: 'What was the core distinction between the Non-Cooperation Movement and the Civil Disobedience Movement?', answer: 'In Non-Cooperation (1920-22), citizens refused to cooperate with colonial institutions; in Civil Disobedience (1930-34), citizens actively broke colonial laws like the Salt Law.' },
      { prompt: 'Why did Mahatma Gandhi choose Salt as the central symbol for nationwide agitation in 1930?', answer: 'Salt was an essential dietary commodity consumed equally by rich and poor; taxing salt and monopolizing its production exemplified British oppression affecting every household.' }
    ]
  }
];

const targetDir = path.resolve(__dirname, '../frontend/public/curriculum');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let generated = 0;
chapters.forEach((ch) => {
  const filePath = path.join(targetDir, ch.fileName);
  const pdfBuffer = createChapterPdf(ch);
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`Generated: ${ch.fileName} (${pdfBuffer.length} bytes)`);
  generated++;
});

console.log(`\nSuccessfully created all ${generated} Social Studies curriculum PDFs in frontend/public/curriculum/`);
