import 'dotenv/config';
import crypto from 'crypto';
import connectDB, { disconnectDB } from '../config/db.js';
import Teacher from '../models/Teacher.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import SyllabusChunk from '../models/SyllabusChunk.js';

const chapters = [
  {
    fileName: 'Class 6 Social Studies Chapter 1.pdf',
    grade: 'Grade 6',
    subject: 'Social Studies',
    lessonName: 'The Earth in the Solar System & Understanding Maps',
    chunks: [
      'Chapter 1: The Earth in the Solar System & Understanding Maps. Scale is the ratio between the actual ground distance and map distance. Small-scale maps represent vast continents (1 cm = 500 km); large-scale maps display detailed local villages and roads (1 cm = 50 m). Essential components of any map are scale, cardinal directions (North, South, East, West), and conventional symbols.',
      'Grid coordinates and lines of latitude (parallels) and longitude (meridians). Parallels run horizontally from Equator (0 degrees) to poles (90 degrees). Meridians run from North to South Pole through Greenwich Prime Meridian (0 degrees). Earth rotation from West to East defines local time zones.'
    ]
  },
  {
    fileName: 'Class 6 Social Studies Chapter 2.pdf',
    grade: 'Grade 6',
    subject: 'Social Studies',
    lessonName: 'History & Early Human Societies',
    chunks: [
      'Chapter 2: History & Early Human Societies. Chronology and dating: BCE (Before Common Era) counts backwards before Year 1; CE (Common Era) counts forward. Hunter-gatherers used chipped stone tools, inhabited caves like Bhimbetka, and painted animal hunting murals.',
      'Dawn of agriculture at Mehrgarh near Bolan Pass around 8000 years ago. Domestication of wheat, barley, sheep, and cattle led to settled pit-dwellings, polished stone axes, and handmade storage pottery.'
    ]
  },
  {
    fileName: 'Class 6 Social Studies Chapter 3.pdf',
    grade: 'Grade 6',
    subject: 'Social Studies',
    lessonName: 'Democratic Governance & Civic Institutions',
    chunks: [
      'Chapter 3: Democratic Governance & Civic Institutions. Levels of government in India: 1. Local government (Gram Panchayat and Municipal Council), 2. State government (enforcing state laws and schools), 3. Central government (national defense and foreign policy).',
      'Universal Adult Franchise guarantees that all adult citizens aged 18 and above have an equal right to vote: one person, one vote, one value. Democratic participation ensures equality and protects against arbitrary rule.'
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 1.pdf',
    grade: 'Grade 7',
    subject: 'Social Studies',
    lessonName: 'The Indian Constitution & Democratic Institutions',
    chunks: [
      'Chapter 1: The Indian Constitution & Democratic Institutions. The Preamble establishes India as a Sovereign, Socialist, Secular, Democratic Republic securing justice, liberty, equality, and fraternity for all citizens.',
      'Separation of Powers: Legislature (makes laws), Executive (implements policies through civil administration), and Judiciary (independent courts interpreting law and safeguarding fundamental rights under Article 15 against discrimination on grounds of religion, race, caste, sex, or birth place).'
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 2.pdf',
    grade: 'Grade 7',
    subject: 'Social Studies',
    lessonName: 'Natural Resources: Land, Water, Air and Conservation',
    chunks: [
      'Chapter 2: Natural Resources: Land, Water, Air and Conservation. Earth four domains: Lithosphere (solid crust of rocks/minerals), Hydrosphere (oceans, rivers, freshwater lakes), Atmosphere (gaseous envelope), and Biosphere (narrow life-supporting zone).',
      'Hydrological freshwater cycle and soil erosion. Overgrazing and deforestation strip fertile topsoil. Scientific conservation techniques include terrace farming on steep mountain slopes, contour bunding, and rainwater harvesting recharging groundwater aquifers.'
    ]
  },
  {
    fileName: 'Class 7 Social Studies Chapter 3.pdf',
    grade: 'Grade 7',
    subject: 'Social Studies',
    lessonName: 'Medieval India: The Delhi Sultanate & Mughal Empire',
    chunks: [
      'Chapter 3: Medieval India: The Delhi Sultanate & Mughal Empire. Administrative hierarchies: Mansabdari system under Akbar where zat determined personal noble rank and sawar designated cavalry troops maintained.',
      'Zabt revenue system formulated by Raja Todar Mal surveyed crop yields and cultivated acreage over 10 years to establish stable cash revenue. Policy of Sulh-i-kul established universal religious tolerance and justice across diverse communities.'
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 1.pdf',
    grade: 'Grade 8',
    subject: 'Social Studies',
    lessonName: 'Colonial Rule & The 1857 Uprising',
    chunks: [
      'Chapter 1: Colonial Rule & The Indian Freedom Movement (Revolt of 1857). Transition of British East India Company from trading enterprise to political master. Economic drain, high peasant land taxation, and Lord Dalhousie Doctrine of Lapse annexing states like Jhansi and Satara sparked widespread disaffection.',
      'Outbreak and aftermath of the Revolt of 1857. Termination of Company rule under Government of India Act 1858 transferring direct sovereignty to the British Crown represented by the Viceroy.'
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 2.pdf',
    grade: 'Grade 8',
    subject: 'Social Studies',
    lessonName: 'Economic Activities & Sectors of the Economy',
    chunks: [
      'Chapter 2: Economic Activities, Sectors & Resource Management. Three economic sectors: Primary sector extracts natural resources (agriculture, mining, fishing); Secondary sector transforms raw materials into finished manufactured goods (textiles, steel production); Tertiary sector delivers services (transportation, banking, education, healthcare).',
      'Interdependence of economic sectors: agricultural cotton (primary) is processed into cloth in mills (secondary) and marketed via freight transport and retail commerce (tertiary). Human capital investments in health and education maximize productive national output.'
    ]
  },
  {
    fileName: 'Class 8 Social Studies Chapter 3.pdf',
    grade: 'Grade 8',
    subject: 'Social Studies',
    lessonName: 'The Indian Constitution, Secularism & The Judiciary',
    chunks: [
      'Chapter 3: The Indian Constitution, Secularism & The Judiciary. Integrated judicial hierarchy: Supreme Court of India is apex constitutional guardian, followed by High Courts in states and Subordinate District Courts.',
      'Public Interest Litigation (PIL) permits any citizen or civic group to approach the court to defend fundamental rights on behalf of disadvantaged citizens. Secularism guarantees non-interference of the state in religious freedom.'
    ]
  },
  {
    fileName: 'Class 9 Social Studies Chapter 1.pdf',
    grade: 'Grade 9',
    subject: 'Social Studies',
    lessonName: 'Democratic Politics - Constitutional Design & Electoral Competition',
    chunks: [
      'Chapter 1: Democratic Politics - Constitutional Design & Electoral Competition. Essential features of democracy: major policies enacted by elected representatives; regular free and fair competitive multi-party elections; universal adult suffrage with one person, one vote; governance circumscribed by constitutional rights.',
      'Indian Constituent Assembly debates (1946-1949) drafting the Constitution of India accommodating vast cultural, linguistic, and socio-economic diversity.'
    ]
  },
  {
    fileName: 'Class 9 Social Studies Chapter 2.pdf',
    grade: 'Grade 9',
    subject: 'Social Studies',
    lessonName: 'Contemporary India - Physical Features & Drainage',
    chunks: [
      'Chapter 2: Contemporary India - Physical Features of India & Natural Drainage. Physiographic divisions: Northern Fold Mountains (Himalayas), Indo-Gangetic Alluvial Plains, Ancient Peninsular Gondwana Plateau, Coastal Plains, and Islands.',
      'Perennial Himalayan rivers (Ganga, Indus, Brahmaputra) fed by glaciers contrast with seasonal, rain-dependent Peninsular rivers (Godavari, Krishna, Narmada).'
    ]
  },
  {
    fileName: 'Class 10 Social Studies Chapter 1.pdf',
    grade: 'Grade 10',
    subject: 'Social Studies',
    lessonName: 'Resources, Sustainable Development & Agriculture',
    chunks: [
      'Chapter 1: Resources, Sustainable Development & Agriculture. Resource planning stages: identification and surveying, developing institutional technological capacity, and matching regional development with national goals under Agenda 21.',
      'Cropping seasons in India: Kharif monsoon crops sown June-July and harvested autumn (Paddy, Maize, Cotton); Rabi winter crops sown October-December and harvested spring (Wheat, Mustard, Gram); Zaid summer crops (watermelon, fodder).'
    ]
  },
  {
    fileName: 'Class 10 Social Studies Chapter 2.pdf',
    grade: 'Grade 10',
    subject: 'Social Studies',
    lessonName: 'Nationalism in India & The Freedom Struggle',
    chunks: [
      'Chapter 2: Nationalism in India & The Freedom Struggle (Board Exam Units). Satyagraha movement led by Mahatma Gandhi against Rowlatt Act and Jallianwala Bagh massacre; Non-Cooperation Movement (1920-1922) boycotting colonial schools and foreign textiles.',
      'Civil Disobedience Movement (1930) initiated with the historic 240-mile Salt March from Sabarmati to Dandi breaking the colonial salt tax monopoly and uniting diverse social strata in collective national belonging.'
    ]
  }
];

async function run() {
  await connectDB();
  const teacher = await Teacher.findOne({ email: 'neev123@gmail.com' });
  if (!teacher) {
    console.error('Teacher neev123@gmail.com not found');
    await disconnectDB();
    return;
  }

  console.log(`Ingesting Social Studies syllabus chunks for teacher: ${teacher.name} (${teacher._id})`);

  let totalChunks = 0;
  for (const ch of chapters) {
    let doc = await SyllabusDocument.findOne({
      teacherId: teacher._id,
      fileName: ch.fileName
    });

    if (!doc) {
      doc = await SyllabusDocument.create({
        teacherId: teacher._id,
        title: ch.lessonName,
        fileName: ch.fileName,
        originalFileName: ch.fileName,
        storageKey: `curriculum/${ch.fileName}`,
        storageProvider: 'local',
        storageBucket: 'neev-curriculum',
        mimeType: 'application/pdf',
        fileSize: 4000,
        fileHash: crypto.createHash('md5').update(ch.fileName).digest('hex'),
        grade: ch.grade,
        subject: ch.subject,
        status: 'completed'
      });
    }

    // Ingest chunks
    for (let i = 0; i < ch.chunks.length; i++) {
      const text = ch.chunks[i];
      const chunkId = `soc_${ch.fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`;
      const contentHash = crypto.createHash('md5').update(text).digest('hex');

      await SyllabusChunk.findOneAndUpdate(
        { chunkId },
        {
          chunkId,
          documentId: doc._id,
          teacherId: teacher._id,
          grade: ch.grade,
          subject: ch.subject,
          lessonName: ch.lessonName,
          sourceFileName: ch.fileName,
          pageNumber: i + 1,
          pageRange: `${i + 1}`,
          chunkIndex: i,
          chunkText: text,
          contentHash,
          status: 'indexed'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      totalChunks++;
    }
  }

  console.log(`Successfully indexed ${totalChunks} Social Studies syllabus chunks in MongoDB Atlas!`);
  await disconnectDB();
}

run().catch(console.error);
