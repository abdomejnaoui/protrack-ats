import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Sparkles,
  Trophy,
  Calendar as CalendarIcon,
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  Plus,
  X,
  Upload,
  Download,
  FileText,
  Check,
  LogOut,
  Edit3,
  Trash2,
  Menu,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  GitMerge,
  Columns,
  List,
  Clock,
  Info,
  Send,
  User,
  Video,
  MapPin,
  Copy,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// CONSTANTES MÉTIER & CONFIGURATION DU CAHIER DES CHARGES
// ============================================================================
const STORAGE_KEY_DEMO = 'protrack_ats_v4_demo_data';
const STORAGE_KEY_REAL = 'protrack_ats_v4_real_data';
const MODE_KEY = 'protrack_ats_v4_mode';
const SESSION_KEY = 'protrack_ats_v4_session';
const DAY = 86400000;

const CRIT = [
  { k: 'formation', l: 'Formation', w: 25, ai: true },
  { k: 'competences', l: 'Compétences techniques', w: 30, ai: true },
  { k: 'experience', l: 'Expérience', w: 20, ai: true },
  { k: 'motivation', l: 'Motivation', w: 10, ai: false },
  { k: 'disponibilite', l: 'Disponibilité', w: 5, ai: false },
  { k: 'salaire', l: 'Prétentions salariales', w: 10, ai: false },
];

const DEFW = () => Object.fromEntries(CRIT.map((c) => [c.k, c.w]));

const STAGES = [
  { k: 'nouvelle', l: 'Nouvelle candidature' },
  { k: 'preselection', l: 'Présélection' },
  { k: 'attente_eval', l: 'En attente d’évaluation' },
  { k: 'entretien_prog', l: 'Entretien programmé' },
  { k: 'entretien_fait', l: 'Entretien réalisé' },
  { k: 'decision', l: 'Décision finale' },
  { k: 'acceptee', l: 'Acceptée' },
  { k: 'rejetee', l: 'Rejetée' },
];

const ST_MAP = Object.fromEntries(STAGES.map((s, i) => [s.k, { ...s, rank: i }]));
const EDU = ['—', 'Bac', 'Bac+2', 'Bac+3', 'Bac+5'];
const ROLES = {
  admin: 'Administratrice',
  rh: 'Responsable RH',
  manager: 'Responsable concerné',
};

const ROUTES = [
  { k: 'dashboard', l: 'Tableau de bord', icon: LayoutDashboard },
  { k: 'offres', l: 'Offres d’emploi', icon: Briefcase },
  { k: 'candidatures', l: 'Candidatures', icon: Users },
  { k: 'analyse', l: 'Analyse IA des CV', icon: Sparkles, roles: ['admin', 'rh'] },
  { k: 'classement', l: 'Classement des candidats', icon: Trophy },
  { k: 'entretiens', l: 'Entretiens', icon: CalendarIcon },
  { k: 'evaluations', l: 'Évaluations', icon: ClipboardCheck },
  { k: 'collaboration', l: 'Collaboration', icon: MessageSquare },
  { k: 'rapports', l: 'Rapports et statistiques', icon: BarChart3, roles: ['admin', 'rh'] },
  { k: 'audit', l: 'Journal d’audit', icon: ShieldCheck, roles: ['admin'] },
  { k: 'parametres', l: 'Paramètres', icon: Settings },
];

const AUDCATS = [
  'Connexion',
  'Candidat',
  'Statut',
  'Décision',
  'Entretien',
  'Notation',
  'E-mail',
  'Utilisateur',
  'Poste',
  'Paramètres',
  'Export',
  'Candidature publique',
  'Système',
];

// ============================================================================
// UTILITAIRES DE FORMATAGE & HACHAGE DÉTERMINISTE
// ============================================================================
const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const fmtD = (t) =>
  t
    ? new Date(t).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtDT = (t) =>
  t
    ? new Date(t).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const isoDay = (t) => {
  const d = new Date(t);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};

const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const r1 = (n) => Math.round(n * 10) / 10;

function hashStr(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hueOf = (s) => hashStr(s) % 360;

// ============================================================================
// MOTEUR D'ÉVALUATION IA & DONNÉES DE DÉMONSTRATION (INSAF EL HAJAJI)
// ============================================================================
const SKILLSETS = {
  j1: ['Excel', 'Comptabilité générale', 'Sage', 'Fiscalité', 'Analyse financière'],
  j2: ['Excel', 'Power BI', 'Reporting', 'Budgétisation', 'SAP'],
  j3: ['React', 'TypeScript', 'Node.js', 'SQL', 'Git'],
  j4: ['SEO', 'Google Ads', 'Réseaux sociaux', 'Canva', 'Analytics'],
  j5: ['Paie', 'Droit du travail', 'Excel', 'Recrutement'],
};

const COMPANIES = [
  'Attijari Finance',
  'Maroc Telecom',
  'OCP Services',
  'Marjane',
  'Lydec',
  'CDG Capital',
  'Sothema',
  'Inwi',
  'Akwa Group',
  'Cabinet Fidaroc',
  'Holmarcom',
];

const ROLES_BY_JOB = {
  j1: 'Aide-comptable',
  j2: 'Analyste financier',
  j3: 'Développeur web',
  j4: 'Assistant marketing',
  j5: 'Assistant administratif',
};

const FIELD_NAMES = {
  comptabilit: 'comptabilité',
  financ: 'finance',
  controle: 'contrôle de gestion',
  'genie logiciel': 'génie logiciel',
};

function aiEvaluate(c, job) {
  const ratio = Math.min(1, (c.eduLevel || 0) / (job.eduLevel || 1));
  const fieldOK = job.eduFields.some((f) =>
    norm(c.eduField + ' ' + c.eduLabel).includes(norm(f))
  );
  const formation = Math.min(10, r1(ratio * 6 + (fieldOK ? 4 : 1.5)));
  const have = job.skills.filter((s) =>
    c.skills.some((x) => norm(x) === norm(s))
  );
  const missing = job.skills.filter((s) => !have.includes(s));
  const competences = job.skills.length
    ? r1((have.length / job.skills.length) * 10)
    : 10;
  const experience = job.expYears
    ? Math.min(10, r1((c.years / job.expYears) * 10))
    : 10;

  const strengths = [];
  const verify = [];
  if (fieldOK && ratio >= 1) strengths.push('Formation conforme : ' + c.eduLabel);
  if (have.length >= job.skills.length - 1 && have.length > 0)
    strengths.push('Compétences clés couvertes : ' + have.join(', '));
  if (c.years >= job.expYears)
    strengths.push(c.years + ' an(s) d’expérience (exigé : ' + job.expYears + ')');
  if (c.years >= job.expYears + 3)
    strengths.push('Expérience nettement supérieure à l’exigence');
  if (c.certs && c.certs.length) strengths.push('Certification : ' + c.certs[0]);
  if (!strengths.length) strengths.push('Profil à examiner en détail');

  if (ratio < 1) verify.push('Niveau de diplôme inférieur à ' + job.eduReq);
  if (!fieldOK) verify.push('Domaine de formation éloigné du poste');
  if (c.years < job.expYears)
    verify.push('Expérience inférieure à ' + job.expYears + ' an(s) exigés');
  if (c.exps && c.exps.length >= 3)
    verify.push('Plusieurs postes courts : vérifier la stabilité');
  verify.push(
    'Motivation, disponibilité et prétentions salariales non déductibles du CV'
  );

  const match = Math.round((formation * 0.3 + competences * 0.45 + experience * 0.25) * 10);
  return {
    notes: { formation, competences, experience },
    strengths,
    missing,
    verify,
    match,
    simulated: true,
    at: Date.now(),
  };
}

function catOfText(t) {
  if (/Courriel/i.test(t)) return 'E-mail';
  if (/Décision/.test(t)) return 'Décision';
  if (/Statut/.test(t)) return 'Statut';
  if (/Entretien|Compte rendu/.test(t)) return 'Entretien';
  if (/Note «|Évaluation/.test(t)) return 'Notation';
  return 'Candidat';
}

function createSeedDatabase() {
  const NOW = Date.now();
  const d = (n) => NOW + n * DAY;
  const at = (dd, h, m = 0) => {
    const dt = new Date(NOW + dd * DAY);
    dt.setHours(h, m, 0, 0);
    return dt.getTime();
  };

  const users = [
    {
      id: 'u1',
      name: 'INSAF EL HAJAJI',
      email: 'admin@protrack.demo',
      pw: 'demo1234',
      role: 'admin',
      jobIds: [],
      active: true,
    },
    {
      id: 'u2',
      name: 'Karim Tazi',
      email: 'rh@protrack.demo',
      pw: 'demo1234',
      role: 'rh',
      jobIds: [],
      active: true,
    },
    {
      id: 'u3',
      name: 'Nadia Cherkaoui',
      email: 'finance@protrack.demo',
      pw: 'demo1234',
      role: 'manager',
      jobIds: ['j1', 'j2'],
      active: true,
      title: 'Directrice Finance',
    },
    {
      id: 'u4',
      name: 'Omar Lahlou',
      email: 'it@protrack.demo',
      pw: 'demo1234',
      role: 'manager',
      jobIds: ['j3', 'j4'],
      active: true,
      title: 'Directeur Digital',
    },
  ];

  const jobs = [
    {
      id: 'j1',
      title: 'Comptable',
      desc: 'Tenue de la comptabilité générale et auxiliaire, clôtures mensuelles, déclarations fiscales et appui au contrôle de gestion.',
      dept: 'Finance',
      eduReq: 'Bac+3 en comptabilité ou finance',
      eduLevel: 3,
      eduFields: ['comptabilit', 'financ', 'gestion'],
      skills: SKILLSETS.j1,
      expYears: 2,
      availability: 'Immédiate à 1 mois',
      other: 'Maîtrise du plan comptable marocain, rigueur, esprit d’équipe.',
      published: d(-45),
      deadline: d(10),
      status: 'Ouverte',
      weights: DEFW(),
      managerIds: ['u3'],
    },
    {
      id: 'j2',
      title: 'Contrôleur de gestion',
      desc: 'Élaboration des budgets, suivi des écarts et reporting mensuel à la direction.',
      dept: 'Finance',
      eduReq: 'Bac+5 en finance ou contrôle de gestion',
      eduLevel: 4,
      eduFields: ['financ', 'controle', 'gestion'],
      skills: SKILLSETS.j2,
      expYears: 3,
      availability: '1 à 2 mois',
      other: 'Anglais professionnel apprécié.',
      published: d(-30),
      deadline: d(21),
      status: 'Ouverte',
      weights: {
        formation: 25,
        competences: 30,
        experience: 25,
        motivation: 10,
        disponibilite: 5,
        salaire: 5,
      },
      managerIds: ['u3'],
    },
    {
      id: 'j3',
      title: 'Développeur Full-Stack',
      desc: 'Conception et développement de modules web (front React, API Node.js) pour nos outils internes.',
      dept: 'Systèmes d’information',
      eduReq: 'Bac+3 en informatique',
      eduLevel: 3,
      eduFields: ['informatique', 'genie logiciel', 'digital'],
      skills: SKILLSETS.j3,
      expYears: 2,
      availability: '1 mois',
      other: 'Pratique des revues de code et des tests automatisés.',
      published: d(-38),
      deadline: d(5),
      status: 'Ouverte',
      weights: {
        formation: 15,
        competences: 40,
        experience: 20,
        motivation: 10,
        disponibilite: 5,
        salaire: 10,
      },
      managerIds: ['u4'],
    },
    {
      id: 'j4',
      title: 'Chargé de marketing digital',
      desc: 'Pilotage des campagnes d’acquisition, du référencement et des réseaux sociaux.',
      dept: 'Marketing',
      eduReq: 'Bac+3 en marketing ou communication digitale',
      eduLevel: 3,
      eduFields: ['marketing', 'communication', 'digital'],
      skills: SKILLSETS.j4,
      expYears: 2,
      availability: 'Immédiate',
      other: 'Portfolio de campagnes apprécié.',
      published: d(-20),
      deadline: d(18),
      status: 'Ouverte',
      weights: DEFW(),
      managerIds: ['u4'],
    },
    {
      id: 'j5',
      title: 'Assistant(e) RH',
      desc: 'Administration du personnel, paie, appui au recrutement.',
      dept: 'Ressources humaines',
      eduReq: 'Bac+3 en gestion des ressources humaines',
      eduLevel: 3,
      eduFields: ['ressources humaines', 'gestion', 'droit'],
      skills: SKILLSETS.j5,
      expYears: 1,
      availability: 'Immédiate',
      other: 'Connaissance du Code du travail marocain.',
      published: d(-80),
      deadline: d(-20),
      status: 'Clôturée',
      weights: DEFW(),
      managerIds: [],
    },
  ];

  const CAND_ROWS = [
    ['Salma Bennani', 'j1', 3, 'Licence en comptabilité', 'comptabilité', 'ISCAE', [0, 1, 2, 3, 4], 4, 'entretien_prog', 16, 8500, [8, 9, 7]],
    ['Youssef El Amrani', 'j1', 4, 'Master en finance', 'finance', 'ENCG Casablanca', [0, 1, 2, 4], 3, 'entretien_fait', 22, 10000, [8, 7, 6]],
    ['Hajar Ouazzani', 'j1', 3, 'Licence en gestion', 'gestion', 'FSJES Rabat', [0, 1, 3], 2, 'preselection', 12, 7500, [5, 6, 6]],
    ['Mehdi Chraibi', 'j1', 2, 'DTS en comptabilité', 'comptabilité', 'OFPPT', [0, 1], 1, 'nouvelle', 3, 6000, null],
    ['Imane Berrada', 'j1', 3, 'Licence en finance', 'finance', 'ENCG Settat', [0, 1, 2, 3], 2, 'attente_eval', 9, 8000, [6, 5, 6]],
    ['Imane Berrada', 'j1', 3, 'Licence en finance', 'finance', 'ENCG Settat', [0, 1, 2], 2, 'nouvelle', 2, 8000, null, 'imane.berrada.pro@mail.ma'],
    ['Anas Fassi', 'j1', 4, 'Master CCA', 'comptabilité', 'ISCAE', [0, 1, 2, 3, 4], 5, 'decision', 28, 11000, [9, 8, 6]],
    ['Khadija Alaoui', 'j1', 3, 'Licence en économie', 'économie', 'FSJES Fès', [0, 4], 1, 'nouvelle', 5, 7000, null],
    ['Reda Tahiri', 'j1', 3, 'Licence en comptabilité', 'comptabilité', 'ENCG Agadir', [0, 1, 2], 3, 'acceptee', 40, 8200, [8, 9, 8]],
    ['Sara Lamrani', 'j1', 3, 'Licence en droit', 'droit', 'FSJES Casablanca', [0], 0, 'rejetee', 30, 6500, [4, 6, 7]],
    ['Ayoub Zniber', 'j1', 4, 'Master en finance', 'finance', 'HEM', [0, 1, 4, 2], 2, 'preselection', 11, 9500, [5, 7, 4]],
    ['Nour El Houda Sebti', 'j1', 3, 'Licence en comptabilité', 'comptabilité', 'FSJES Marrakech', [1, 0, 3], 6, 'attente_eval', 14, 9000, [6, 4, 5]],
    ['Amine Kettani', 'j1', 3, 'Licence en gestion', 'gestion', 'ENCG Tanger', [0, 1], 1, 'nouvelle', 1, 7000, null],
    ['Ilham Benjelloun', 'j2', 4, 'Master en contrôle de gestion', 'contrôle de gestion', 'ESCA', [0, 1, 2, 3, 4], 5, 'entretien_prog', 18, 16000, [8, 7, 7]],
    ['Zakaria Mernissi', 'j2', 4, 'Master en finance', 'finance', 'HEM', [0, 1, 2, 3], 4, 'entretien_fait', 25, 15000, [8, 8, 6]],
    ['Lina Sqalli', 'j2', 3, 'Licence en finance', 'finance', 'ENCG Casablanca', [0, 2], 2, 'preselection', 10, 12000, null],
    ['Walid Hajji', 'j2', 4, 'Master en gestion', 'gestion', 'ISCAE', [0, 3], 3, 'nouvelle', 4, 14000, null],
    ['Rania Bouzid', 'j3', 3, 'Licence en informatique', 'informatique', 'EMSI', [0, 1, 2, 3, 4], 4, 'acceptee', 50, 14000, [9, 8, 7]],
    ['Soufiane Rhazi', 'j3', 3, 'Licence en génie logiciel', 'génie logiciel', 'ENSA', [0, 1, 2, 4], 3, 'entretien_prog', 15, 13000, [8, 8, 8]],
    ['Chaimae Naciri', 'j3', 3, 'Licence en informatique', 'informatique', 'FST', [0, 2, 3], 1, 'preselection', 8, 10000, null],
    ['Hamza Benkirane', 'j3', 2, 'DUT informatique', 'informatique', 'EST', [1, 4], 0, 'nouvelle', 2, 8000, null],
    ['Ghita Amrani', 'j4', 3, 'Licence en marketing digital', 'marketing', 'ISCAE', [0, 1, 2, 3, 4], 3, 'entretien_prog', 13, 9000, [8, 8, 8]],
    ['Badr Skalli', 'j4', 3, 'Licence en communication', 'communication', 'ISIC', [2, 3], 1, 'preselection', 7, 7000, null],
    ['Yasmine Filali', 'j4', 4, 'Master en marketing', 'marketing', 'HEM', [0, 1, 4], 2, 'nouvelle', 3, 10000, null],
    ['Meryem Oudghiri', 'j5', 3, 'Licence en ressources humaines', 'ressources humaines', 'ENCG Oujda', [0, 1, 2, 3], 2, 'acceptee', 70, 7500, [8, 9, 8]],
    ['Taha Lazrak', 'j5', 3, 'Licence en droit social', 'droit', 'FSJES Rabat', [1, 2], 0, 'rejetee', 65, 6500, [5, 7, 6]],
  ];

  const cands = CAND_ROWS.map((r, i) => {
    const [name, jobId, eduLevel, eduLabel, eduField, school, sk, years, status, ago, salary, hr, altEmail] = r;
    const job = jobs.find((j) => j.id === jobId);
    const rnd = seededRng(hashStr(name + jobId + i));
    const first = norm(name).split(' ')[0];
    const last = norm(name).split(' ').slice(-1)[0];
    const skills = sk.map((x) => SKILLSETS[jobId][x]);
    const exps = [];
    let left = years;
    let y = new Date(NOW).getFullYear();
    while (left > 0) {
      const dur = Math.min(left, Math.max(1, Math.round(1 + rnd() * 2)));
      exps.push({
        role: exps.length ? ROLES_BY_JOB[jobId] : ROLES_BY_JOB[jobId].replace('Aide-', '').replace('Assistant', 'Chargé'),
        company: COMPANIES[Math.floor(rnd() * COMPANIES.length)],
        years: dur,
        period: y - dur + ' – ' + y,
      });
      y -= dur;
      left -= dur;
    }
    const applied = NOW - ago * DAY;
    const c = {
      id: 'c' + (i + 1),
      name,
      email: altEmail || `${first}.${last}@mail.ma`,
      phone:
        '+212 6' +
        String(10000000 + Math.floor(rnd() * 89999999))
          .slice(0, 8)
          .replace(/(\d{2})(?=\d)/g, '$1 ')
          .trim(),
      city: ['Casablanca', 'Rabat', 'Tanger', 'Marrakech', 'Fès', 'Agadir'][Math.floor(rnd() * 6)],
      jobId,
      appliedAt: applied,
      status,
      eduLevel,
      eduLabel,
      eduField,
      school,
      skills,
      exps,
      years,
      langs: rnd() > 0.4 ? ['Arabe', 'Français', 'Anglais'] : ['Arabe', 'Français'],
      certs: rnd() > 0.6 ? ['Certification Excel avancé'] : [],
      salary,
      cvFile: null,
      notes: {},
      noteSrc: {},
      dupOk: [],
      mails: [],
      history: [],
    };
    c.ai = aiEvaluate(c, job);
    CRIT.forEach((k) => {
      c.notes[k.k] = c.ai.notes[k.k] ?? null;
      c.noteSrc[k.k] = c.ai.notes[k.k] != null ? 'ia' : null;
    });
    if (hr) {
      ['motivation', 'disponibilite', 'salaire'].forEach((k, j) => {
        c.notes[k] = hr[j];
        c.noteSrc[k] = 'rh';
      });
    }
    c.history.push({ t: applied, by: null, text: 'Candidature reçue pour le poste « ' + job.title + ' »' });
    c.history.push({ t: applied + 3600000, by: null, text: 'Analyse IA des CV (mode démo, simulée) effectuée' });
    const path = ['nouvelle', 'preselection', 'attente_eval', 'entretien_prog', 'entretien_fait', 'decision'];
    const idx = status === 'acceptee' ? path.length : status === 'rejetee' ? 1 : path.indexOf(status);
    for (let s = 1; s <= Math.min(idx, path.length - 1) + (status === 'acceptee' ? 1 : 0); s++) {
      const st = path[s];
      if (st && s <= idx) {
        c.history.push({
          t: applied + s * 2.2 * DAY,
          by: 'u2',
          text: 'Statut : ' + ST_MAP[path[s - 1]].l + ' → ' + ST_MAP[st].l,
        });
      }
    }
    if (status === 'acceptee') {
      c.decidedAt = applied + Math.min(ago - 1, 21 + Math.floor(rnd() * 14)) * DAY;
      c.history.push({ t: c.decidedAt, by: 'u1', text: 'Décision finale : candidature acceptée' });
    }
    if (status === 'rejetee') {
      c.rejectedFrom = 1;
      c.decidedAt = applied + 9 * DAY;
      c.history.push({ t: c.decidedAt, by: 'u1', text: 'Décision finale : candidature rejetée' });
    }
    return c;
  });

  const cid = (n) => cands.find((c) => c.name === n).id;
  const interviews = [
    { id: 'i1', candId: cid('Salma Bennani'), jobId: 'j1', at: at(2, 10), dur: 45, mode: 'Visioconférence', people: ['u2', 'u3'], status: 'Programmé', report: '', mails: [] },
    { id: 'i2', candId: cid('Ilham Benjelloun'), jobId: 'j2', at: at(4, 14, 30), dur: 60, mode: 'Présentiel', people: ['u2', 'u3'], status: 'Programmé', report: '', mails: [] },
    { id: 'i3', candId: cid('Soufiane Rhazi'), jobId: 'j3', at: at(1, 9, 30), dur: 60, mode: 'Visioconférence', people: ['u2', 'u4'], status: 'Programmé', report: '', mails: [] },
    { id: 'i4', candId: cid('Ghita Amrani'), jobId: 'j4', at: at(6, 11), dur: 45, mode: 'Présentiel', people: ['u2', 'u4'], status: 'Programmé', report: '', mails: [] },
    { id: 'i5', candId: cid('Youssef El Amrani'), jobId: 'j1', at: at(-3, 10), dur: 45, mode: 'Visioconférence', people: ['u2', 'u3'], status: 'Réalisé', report: 'Candidat solide sur la consolidation et Sage. Bonne communication. À confirmer : disponibilité sous 2 mois et prétentions.', mails: [] },
    { id: 'i6', candId: cid('Anas Fassi'), jobId: 'j1', at: at(-6, 15), dur: 60, mode: 'Présentiel', people: ['u2', 'u3'], status: 'Réalisé', report: 'Profil senior, très à l’aise sur la fiscalité. Prétentions en haut de fourchette.', mails: [] },
    { id: 'i7', candId: cid('Zakaria Mernissi'), jobId: 'j2', at: at(-2, 16), dur: 60, mode: 'Visioconférence', people: ['u2', 'u3'], status: 'Réalisé', report: 'Bonne maîtrise de Power BI et de la budgétisation. Peu d’exposition à SAP.', mails: [] },
    { id: 'i8', candId: cid('Reda Tahiri'), jobId: 'j1', at: at(-20, 10), dur: 45, mode: 'Présentiel', people: ['u2', 'u3'], status: 'Réalisé', report: 'Très bonne impression, disponible immédiatement.', mails: [] },
  ];

  const ev = (cn, u, dd, n, cm) => ({ id: uid('e'), candId: cid(cn), by: u, at: NOW - dd * DAY, notes: n, comment: cm });
  const evaluations = [
    ev('Youssef El Amrani', 'u3', 3, { formation: 8, competences: 8, experience: 7, motivation: 8, disponibilite: 6, salaire: 6 }, 'Solide techniquement, à confirmer sur la disponibilité.'),
    ev('Youssef El Amrani', 'u2', 3, { formation: 8, competences: 7, experience: 7, motivation: 8, disponibilite: 7, salaire: 6 }, 'Bon entretien RH.'),
    ev('Anas Fassi', 'u3', 6, { formation: 9, competences: 9, experience: 9, motivation: 8, disponibilite: 7, salaire: 5 }, 'Profil senior, recommandé sous réserve du budget.'),
    ev('Zakaria Mernissi', 'u3', 2, { formation: 8, competences: 7, experience: 7, motivation: 8, disponibilite: 8, salaire: 6 }, 'Manque de pratique sur SAP, formation possible.'),
    ev('Reda Tahiri', 'u3', 20, { formation: 8, competences: 8, experience: 8, motivation: 9, disponibilite: 9, salaire: 8 }, 'Excellent. Recruté.'),
  ];

  const cm = (cn, u, dd, t, type = 'comment') => ({ id: uid('m'), candId: cn ? cid(cn) : null, by: u, at: NOW - dd * DAY, text: t, type });
  const comments = [
    cm('Anas Fassi', 'u3', 5, 'Très bon entretien. Quelqu’un a-t-il vérifié ses références chez ISCAE Conseil ?'),
    cm('Anas Fassi', 'u2', 4, 'Références demandées, retour attendu jeudi.'),
    cm('Salma Bennani', 'u2', 2, 'Je propose un entretien visio avec Nadia. Dossier complet, bonne adéquation.'),
    cm('Soufiane Rhazi', 'u4', 1, 'Test technique réussi côté API, à creuser sur TypeScript.'),
    cm('Imane Berrada', 'u2', 1, 'Doublon probable avec une candidature reçue hier. À arbitrer.'),
    cm(null, 'u1', 7, 'Rappel : clôture de l’offre Comptable dans 10 jours. Merci de finaliser les évaluations.'),
  ];

  const notifs = [
    { id: uid('n'), t: NOW - 2 * 3600000, text: 'Doublon probable : Imane Berrada (2 dossiers)', read: false, to: 'candidatures' },
    { id: uid('n'), t: NOW - 5 * 3600000, text: 'Entretien demain 09:30 : Soufiane Rhazi', read: false, to: 'entretiens' },
    { id: uid('n'), t: NOW - 1 * DAY, text: 'Nouvelle candidature : Amine Kettani', read: true, to: 'candidatures' },
    { id: uid('n'), t: NOW - 2 * DAY, text: 'L’offre « Développeur Full-Stack » se termine dans 5 jours', read: true, to: 'offres' },
  ];

  const audit = cands
    .flatMap((c) =>
      c.history
        .filter((h) => h.by)
        .map((h) => ({ id: uid('a'), t: h.t, by: h.by, cat: catOfText(h.text), text: h.text, target: c.name }))
    )
    .sort((a, b) => a.t - b.t);

  return {
    v: 4,
    users,
    jobs,
    cands,
    interviews,
    evaluations,
    comments,
    notifs,
    audit,
    settings: { hi: 75, lo: 50, unrated: 'zero', autoMail: true },
  };
}

function createRealDatabase() {
  return {
    v: 4,
    users: [
      {
        id: 'u1',
        name: 'INSAF EL HAJAJI',
        email: 'admin@protrack.demo',
        pw: 'demo1234',
        role: 'admin',
        jobIds: [],
        active: true,
      },
    ],
    jobs: [],
    cands: [],
    interviews: [],
    evaluations: [],
    comments: [],
    notifs: [
      {
        id: uid('n'),
        t: Date.now(),
        text: 'Bienvenue dans votre Espace Réel ProTrack ATS. Commencez par créer une offre d’emploi.',
        read: false,
        to: 'offres',
      },
    ],
    audit: [
      {
        id: uid('a'),
        t: Date.now(),
        by: 'u1',
        cat: 'Système',
        text: 'Initialisation de l’Espace Réel (base vierge)',
        target: 'ProTrack ATS',
      },
    ],
    settings: { hi: 75, lo: 50, unrated: 'zero', autoMail: true },
  };
}

// ============================================================================
// MOTEUR DE SCORING & EXPORT PDF/CSV
// ============================================================================
function scoreOf(c, job, mode) {
  let sum = 0;
  let cov = 0;
  CRIT.forEach((k) => {
    const n = c.notes[k.k];
    const w = (job?.weights && job.weights[k.k]) || 0;
    if (n != null && n !== '') {
      sum += (Number(n) / 10) * w;
      cov += w;
    }
  });
  const total = mode === 'normalize' && cov > 0 ? (sum / cov) * 100 : sum;
  return {
    score: r1(total),
    covered: cov,
    complete: cov >= 99.9,
    missing: CRIT.filter((k) => c.notes[k.k] == null || c.notes[k.k] === '').map((k) => k.l),
  };
}

function evTotal(notes, job) {
  let s = 0;
  let w = 0;
  CRIT.forEach((k) => {
    if (notes[k.k] != null && notes[k.k] !== '') {
      s += (Number(notes[k.k]) / 10) * ((job?.weights && job.weights[k.k]) || 0);
      w += (job?.weights && job.weights[k.k]) || 0;
    }
  });
  return w ? r1((s / w) * 100) : null;
}

function levelOf(s, settings) {
  if (s >= settings.hi) return { k: 'good', l: 'Recommandé pour un entretien' };
  if (s >= settings.lo) return { k: 'warn', l: 'À étudier' };
  return { k: 'bad', l: 'Rejet proposé' };
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makePdfBytes(title, lines) {
  const enc = (s) =>
    String(s)
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/→/g, '->')
      .replace(/[^\x20-\xFF]/g, '?')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  const pages = [];
  let cur = [];
  let y = 800;
  const push = () => {
    pages.push(cur);
    cur = [];
    y = 800;
  };
  [{ t: title, s: 18, b: 1 }, ...lines].forEach((l) => {
    if (typeof l === 'string') l = { t: l, s: 10 };
    const wrap = [];
    const max = Math.floor(520 / (l.s * 0.5));
    let t = l.t;
    if (!t) wrap.push('');
    else {
      while (t.length > max) {
        let k = t.lastIndexOf(' ', max);
        if (k < 1) k = max;
        wrap.push(t.slice(0, k));
        t = t.slice(k).trim();
      }
      if (t) wrap.push(t);
    }
    wrap.forEach((w) => {
      if (y < 60) push();
      cur.push(`BT /F${l.b ? 2 : 1} ${l.s} Tf 50 ${y} Td (${enc(w)}) Tj ET`);
      y -= l.s + 5;
    });
  });
  if (cur.length || !pages.length) pages.push(cur);
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = pages.map((_, i) => 5 + i * 2 + ' 0 R').join(' ');
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((p, i) => {
    const body = p.join('\n');
    objs[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const off = [];
  for (let i = 1; i < objs.length; i++) {
    off[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xr = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  const u = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) u[i] = out.charCodeAt(i) & 255;
  return u;
}

const buildCsvContent = (rows) =>
  '\uFEFF' + rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');

// ============================================================================
// COMPOSANTS UI RÉUTILISABLES (AVATAR, LOGO, PILL, GRAPHIQUES SVG)
// ============================================================================
function BrandLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="ptGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F73FF" />
          <stop offset="1" stopColor="#1D3BD1" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ptGrad)" />
      <path
        d="M9 27l7-7 5 4 10-11"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="27" r="2.6" fill="#0A1233" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16" cy="20" r="2.6" fill="#0A1233" stroke="#fff" strokeWidth="1.8" />
      <circle cx="31" cy="13" r="3.6" fill="#fff" />
    </svg>
  );
}

function Avatar({ name, size = 'md' }) {
  const h = hueOf(name || 'U');
  const initials = (name || '?')
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const cls = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs';
  return (
    <span
      className={`${cls} rounded-full grid place-items-center text-white font-bold shrink-0 select-none`}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 70% 46%), hsl(${(h + 40) % 360} 70% 36%))`,
      }}
    >
      {initials}
    </span>
  );
}

function StatusPill({ status }) {
  const styleMap = {
    acceptee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejetee: 'bg-rose-50 text-rose-700 border-rose-200',
    decision: 'bg-amber-50 text-amber-700 border-amber-200',
    nouvelle: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
        styleMap[status] || 'bg-blue-50 text-blue-700 border-blue-200'
      }`}
    >
      {ST_MAP[status]?.l || status}
    </span>
  );
}

function ScoreBadge({ score, complete, settings }) {
  const lv = levelOf(score, settings);
  const cls = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-rose-50 text-rose-700 border-rose-200',
  }[lv.k];
  return (
    <span
      title={lv.l}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${cls}`}
    >
      {score}
      {!complete ? ' (prov.)' : ''}
    </span>
  );
}

function LineChartSVG({ vals, labels }) {
  const W = 560;
  const H = 210;
  const p = { l: 34, r: 18, t: 28, b: 28 };
  const n = vals.length;
  const mx = Math.max(4, Math.ceil(Math.max(...vals, 1) / 4) * 4);
  const X = (i) => p.l + (i * (W - p.l - p.r)) / Math.max(1, n - 1);
  const Y = (v) => p.t + (1 - v / mx) * (H - p.t - p.b);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const area = `${line} L${X(n - 1)} ${H - p.b} L${X(0)} ${H - p.b} Z`;
  const last = pts[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Évolution des candidatures">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B55F5" stopOpacity="0.25" />
          <stop offset="1" stopColor="#2B55F5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (mx * k) / 4;
        const y = Y(v);
        return (
          <g key={k}>
            <line x1={p.l} x2={W - p.r} y1={y} y2={y} stroke="#E2E8F0" />
            <text x={p.l - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="#64748B">
              {v}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r="3" fill="#fff" stroke="#2563EB" strokeWidth="2">
          <title>
            {labels[i]} : {vals[i]}
          </title>
        </circle>
      ))}
      <circle cx={last[0]} cy={last[1]} r="5.5" fill="#2563EB" />
      <text x={last[0]} y={last[1] - 11} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0F172A">
        {vals[n - 1]}
      </text>
      {labels.map((l, i) => (
        <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#64748B">
          {l}
        </text>
      ))}
    </svg>
  );
}

function DonutSVG({ items, totalLabel = 'candidatures' }) {
  const sum = items.reduce((a, b) => a + b.v, 0);
  const tot = sum || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let off = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" width="144" height="144" className="shrink-0">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#F1F5F9" strokeWidth="18" />
        {items
          .filter((i) => i.v > 0)
          .map((i, idx) => {
            const len = (i.v / tot) * C;
            const seg = (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={i.color}
                strokeWidth="18"
                strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`}
                strokeDashoffset={-off}
                transform="rotate(-90 70 70)"
              />
            );
            off += len;
            return seg;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0F172A">
          {sum}
        </text>
        <text x="70" y="85" textAnchor="middle" fontSize="10" fill="#64748B">
          {totalLabel}
        </text>
      </svg>
      <div className="flex-1 min-w-[160px] space-y-1.5 text-xs">
        {items.map((i, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: i.color }} />
            <span className="flex-1 truncate text-slate-700">{i.l}</span>
            <b className="font-semibold text-slate-900 tabular-nums">{i.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// APPLICATION PRINCIPALE PROTRACK ATS
// ============================================================================
export default function App() {
  const [appMode, setAppMode] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY) === 'real' ? 'real' : 'demo';
    } catch (e) {
      return 'demo';
    }
  });

  const [db, setDb] = useState(() => {
    const mode = (() => {
      try {
        return localStorage.getItem(MODE_KEY) === 'real' ? 'real' : 'demo';
      } catch (e) {
        return 'demo';
      }
    })();
    const key = mode === 'real' ? STORAGE_KEY_REAL : STORAGE_KEY_DEMO;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 4) return parsed;
      }
    } catch (e) {}
    return mode === 'real' ? createRealDatabase() : createSeedDatabase();
  });

  const [sessionUid, setSessionUid] = useState(() => {
    try {
      return localStorage.getItem(SESSION_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  const [publicCareersMode, setPublicCareersMode] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [sideOpen, setSideOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [selectedCandId, setSelectedCandId] = useState(null);
  const [selectedCandTab, setSelectedCandTab] = useState('infos');
  const [modalState, setModalState] = useState(null);

  // États spécifiques aux pages
  const [candFilters, setCandFilters] = useState({ q: '', job: '', skill: '', exp: '', status: '', view: 'list' });
  const [analyzerState, setAnalyzerState] = useState({ jobId: 'j1', step: 1 });
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rankState, setRankState] = useState({ jobId: 'j1', level: '' });
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [calSelDay, setCalSelDay] = useState(null);
  const [evalCandId, setEvalCandId] = useState(null);
  const [collabFilter, setCollabFilter] = useState('all');
  const [repFilters, setRepFilters] = useState({ period: 'all', job: '' });
  const [audFilters, setAudFilters] = useState({ q: '', user: '', cat: '', period: 'all' });
  const [settingsTab, setSettingsTab] = useState('profil');

  // Persistance automatique selon le mode actif (Démo ou Réel)
  useEffect(() => {
    try {
      const key = appMode === 'real' ? STORAGE_KEY_REAL : STORAGE_KEY_DEMO;
      localStorage.setItem(key, JSON.stringify(db));
      localStorage.setItem(MODE_KEY, appMode);
    } catch (e) {}
  }, [db, appMode]);

  useEffect(() => {
    try {
      if (sessionUid) localStorage.setItem(SESSION_KEY, sessionUid);
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }, [sessionUid]);

  const showToast = (msg, type = 'ok') => {
    const id = uid('t');
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  };

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === sessionUid && u.active) || null,
    [db.users, sessionUid]
  );

  const perms = useMemo(() => {
    const r = currentUser?.role;
    return {
      manageJobs: r === 'admin' || r === 'rh',
      manageUsers: r === 'admin',
      work: r === 'admin' || r === 'rh',
      decide: r === 'admin',
    };
  }, [currentUser]);

  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'manager') {
      return db.jobs.filter((j) => currentUser.jobIds.includes(j.id));
    }
    return db.jobs;
  }, [db.jobs, currentUser]);

  const visibleCands = useMemo(() => {
    const ids = new Set(visibleJobs.map((j) => j.id));
    return db.cands.filter((c) => ids.has(c.jobId));
  }, [db.cands, visibleJobs]);

  const visibleInterviews = useMemo(() => {
    const ids = new Set(visibleCands.map((c) => c.id));
    return db.interviews.filter((i) => ids.has(i.candId));
  }, [db.interviews, visibleCands]);

  const allowedRoutes = useMemo(() => {
    if (!currentUser) return [];
    return ROUTES.filter((r) => !r.roles || r.roles.includes(currentUser.role));
  }, [currentUser]);

  const searchResults = useMemo(() => {
    const q = norm(globalQuery);
    if (q.length < 2) return { cands: [], jobs: [] };
    return {
      cands: visibleCands
        .filter((c) => norm(c.name + ' ' + c.email + ' ' + c.skills.join(' ')).includes(q))
        .slice(0, 6),
      jobs: visibleJobs.filter((j) => norm(j.title + ' ' + j.dept).includes(q)).slice(0, 4),
    };
  }, [globalQuery, visibleCands, visibleJobs]);

  const uname = (id) => (id ? db.users.find((u) => u.id === id)?.name || 'Ancien utilisateur' : 'Système');
  const jobOf = (id) => db.jobs.find((j) => j.id === id);
  const candOf = (id) => db.cands.find((c) => c.id === id);

  // ============================================================================
  // ACTIONS MÉTIER & MUTATIONS D'ÉTAT TRAÇABLES
  // ============================================================================
  const addAuditEntry = (prev, cat, text, target = '', overrideBy = undefined, overrideWho = undefined) => {
    const by = overrideBy !== undefined ? overrideBy : currentUser?.id || null;
    const entry = {
      id: uid('a'),
      t: Date.now(),
      by,
      who: overrideWho,
      cat,
      text,
      target,
    };
    return [...(prev.audit || []).slice(-1499), entry];
  };

  const handleLogin = (email, pw) => {
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.pw !== pw) {
      setDb((prev) => ({
        ...prev,
        audit: addAuditEntry(prev, 'Connexion', 'Échec de connexion', email, null, 'Visiteur'),
      }));
      return 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (!u.active) return 'Ce compte est désactivé. Contactez l’administratrice INSAF EL HAJAJI.';
    setSessionUid(u.id);
    setPage('dashboard');
    setDb((prev) => ({
      ...prev,
      audit: addAuditEntry(prev, 'Connexion', 'Connexion réussie', u.email, u.id),
    }));
    showToast('Bienvenue, ' + u.name + '.');
    return null;
  };

  const handleLogout = () => {
    setDb((prev) => ({
      ...prev,
      audit: addAuditEntry(prev, 'Connexion', 'Déconnexion'),
    }));
    setSessionUid(null);
    setSelectedCandId(null);
    setOpenDropdown(null);
  };

  const handleResetDemo = () => {
    const fresh = createSeedDatabase();
    setDb(fresh);
    setUploadQueue([]);
    setSelectedCandId(null);
    setModalState(null);
    showToast('Données de démonstration restaurées avec succès.');
  };

  const handleSwitchMode = (targetMode) => {
    if (targetMode === appMode) return;
    try {
      const currentKey = appMode === 'real' ? STORAGE_KEY_REAL : STORAGE_KEY_DEMO;
      localStorage.setItem(currentKey, JSON.stringify(db));
      localStorage.setItem(MODE_KEY, targetMode);
    } catch (e) {}

    const nextKey = targetMode === 'real' ? STORAGE_KEY_REAL : STORAGE_KEY_DEMO;
    let loaded = null;
    try {
      const raw = localStorage.getItem(nextKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 4) loaded = parsed;
      }
    } catch (e) {}

    const nextDb = loaded || (targetMode === 'real' ? createRealDatabase() : createSeedDatabase());
    setAppMode(targetMode);
    setDb(nextDb);
    setUploadQueue([]);
    setSelectedCandId(null);
    setModalState(null);
    setPage('dashboard');
    if (currentUser && !nextDb.users.some((u) => u.id === currentUser.id && u.active)) {
      setSessionUid('u1');
    }
    showToast(
      targetMode === 'real'
        ? 'Basculé vers l’Espace Réel : vos propres offres et candidatures sont isolées.'
        : 'Basculé vers le Mode Démonstration (26 candidats fictifs).'
    );
  };

  const handleMoveStage = (candId, targetKey) => {
    const c = candOf(candId);
    if (!c || c.status === targetKey) return;
    if (!perms.work) {
      showToast('Votre profil ne permet pas de déplacer les candidats.', 'err');
      return;
    }
    if (targetKey === 'final') {
      if (!perms.decide) {
        showToast('Seule l’administratrice prend la décision finale.', 'err');
        return;
      }
      setModalState({ type: 'decide', candId });
      return;
    }
    if (['acceptee', 'rejetee'].includes(c.status) && !perms.decide) {
      showToast('Seule l’administratrice peut revenir sur une décision finale.', 'err');
      return;
    }
    const fromLabel = ST_MAP[c.status]?.l || c.status;
    const toLabel = ST_MAP[targetKey]?.l || targetKey;
    const msg = `Statut : ${fromLabel} → ${toLabel}`;
    setDb((prev) => ({
      ...prev,
      cands: prev.cands.map((x) =>
        x.id === candId
          ? {
              ...x,
              status: targetKey,
              decidedAt: null,
              history: [...x.history, { t: Date.now(), by: currentUser.id, text: msg }],
            }
          : x
      ),
      audit: addAuditEntry(prev, 'Statut', msg, c.name),
    }));
    showToast(`${c.name} : ${toLabel}`);
  };

  const handleFinalDecision = (candId, decision, sendAutoMail) => {
    const c = candOf(candId);
    if (!c) return;
    const j = jobOf(c.jobId);
    const label = decision === 'acceptee' ? 'acceptée' : 'rejetée';
    const msg = `Décision finale : candidature ${label}`;
    let mailObj = null;
    if (sendAutoMail) {
      const subj =
        (decision === 'acceptee'
          ? 'Suite favorable à votre candidature : '
          : 'Réponse à votre candidature : ') + (j?.title || '');
      const body =
        decision === 'acceptee'
          ? `Bonjour ${c.name},\n\nNous avons le plaisir de vous informer que votre candidature pour le poste « ${j?.title} » a été retenue.\n\nNotre équipe RH vous contactera très prochainement pour les prochaines étapes.\n\nCordialement,\n${currentUser.name}\nProTrack ATS`
          : `Bonjour ${c.name},\n\nNous vous remercions de l’intérêt porté au poste « ${j?.title} ». Après étude attentive, nous ne pouvons pas donner suite à votre dossier pour ce poste.\n\nCordialement,\n${currentUser.name}\nProTrack ATS`;
      mailObj = {
        id: uid('ml'),
        kind: decision === 'acceptee' ? 'accept' : 'refus',
        to: [c.email],
        subject: subj,
        body,
        at: Date.now(),
        status: 'Envoi simulé',
      };
    }

    setDb((prev) => ({
      ...prev,
      cands: prev.cands.map((x) =>
        x.id === candId
          ? {
              ...x,
              status: decision,
              rejectedFrom: decision === 'rejetee' ? ST_MAP[x.status]?.rank ?? 5 : x.rejectedFrom,
              decidedAt: Date.now(),
              mails: mailObj ? [...(x.mails || []), mailObj] : x.mails || [],
              history: [
                ...x.history,
                { t: Date.now(), by: currentUser.id, text: msg },
                ...(mailObj
                  ? [
                      {
                        t: Date.now(),
                        by: currentUser.id,
                        text: `Courriel « ${mailObj.subject} » envoyé à ${c.email} (envoi simulé)`,
                      },
                    ]
                  : []),
              ],
            }
          : x
      ),
      notifs: [
        { id: uid('n'), t: Date.now(), text: `${c.name} : candidature ${label}`, read: false, to: 'candidatures' },
        ...prev.notifs,
      ],
      audit: addAuditEntry(prev, 'Décision', msg, c.name),
    }));
    setModalState(null);
    showToast(`Candidature ${label} : ${c.name}.` + (sendAutoMail ? ' E-mail généré (envoi simulé).' : ''));
  };

  // ============================================================================
  // GESTION DE L'IMPORT DE CV & ANALYSE SIMULÉE EN FILE D'ATTENTE
  // ============================================================================
  const handleQueueFiles = (fileList, jobId, autoAnalyze = false) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    let room = 50 - uploadQueue.filter((q) => q.jobId === jobId).length;
    const accepted = [];

    files.forEach((f) => {
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
        showToast(`« ${f.name} » ignoré : seuls les fichiers PDF sont acceptés.`, 'err');
        return;
      }
      if (f.size > 10 * 1048576) {
        showToast(`« ${f.name} » dépasse 10 Mo.`, 'err');
        return;
      }
      if (room <= 0) {
        showToast('Limite atteinte : 50 CV maximum par poste.', 'warn');
        return;
      }
      room--;
      accepted.push({
        id: uid('q'),
        file: f,
        name: f.name,
        size: f.size,
        state: 'attente',
        pct: 0,
        jobId,
      });
    });

    if (accepted.length) {
      setUploadQueue((prev) => [...prev, ...accepted]);
      if (autoAnalyze) {
        setTimeout(() => runQueueSimulation(accepted, true), 80);
      } else {
        setTimeout(() => runQueueSimulation(accepted, false), 80);
      }
    }
  };

  const runQueueSimulation = async (itemsToProcess, analyzeAfterImport) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    try {
      for (const item of itemsToProcess) {
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, state: 'attente', pct: 45 } : q))
        );
        await sleep(140);
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, state: 'importé', pct: 100 } : q))
        );
        await sleep(120);

        if (analyzeAfterImport) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, state: 'lecture' } : q))
          );
          await sleep(220);
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, state: 'extraction' } : q))
          );
          await sleep(220);

          const job = jobOf(item.jobId);
          if (job) {
            const cleanName =
              item.name
                .replace(/\.pdf$/i, '')
                .replace(/[_\-.]+/g, ' ')
                .replace(/\b(cv|resume|curriculum|vitae)\b/gi, ' ')
                .replace(/\d+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim() || 'Candidat importé';
            const formattedName = cleanName
              .split(' ')
              .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
            const rnd = seededRng(hashStr(formattedName + item.size));
            const lvl = 2 + Math.floor(rnd() * 3);
            const field = job.eduFields[Math.floor(rnd() * job.eduFields.length)] || 'gestion';
            const skills = job.skills.filter(() => rnd() < 0.68);
            const years = Math.floor(rnd() * 7);
            const first = norm(formattedName).split(' ')[0];
            const last = norm(formattedName).split(' ').slice(-1)[0];

            const newCand = {
              id: uid('c'),
              name: formattedName,
              email: `${first}.${last}@mail.ma`,
              phone:
                '+212 6' +
                String(10000000 + Math.floor(rnd() * 89999999))
                  .slice(0, 8)
                  .replace(/(\d{2})(?=\d)/g, '$1 ')
                  .trim(),
              city: 'Non renseignée',
              jobId: item.jobId,
              appliedAt: Date.now(),
              status: 'nouvelle',
              eduLevel: lvl,
              eduLabel: `${EDU[lvl]} en ${FIELD_NAMES[field] || field}`,
              eduField: field,
              school: 'Établissement non précisé',
              skills,
              exps: years
                ? [
                    {
                      role: 'Poste précédent',
                      company: COMPANIES[Math.floor(rnd() * COMPANIES.length)],
                      years,
                      period: '—',
                    },
                  ]
                : [],
              years,
              langs: ['Arabe', 'Français'],
              certs: [],
              salary: 0,
              cvFile: { name: item.name, size: item.size },
              synthetic: true,
              notes: {},
              noteSrc: {},
              dupOk: [],
              mails: [],
              history: [
                {
                  t: Date.now(),
                  by: currentUser?.id || 'u1',
                  text: `CV importé (« ${item.name} ») pour le poste « ${job.title} »`,
                },
                {
                  t: Date.now(),
                  by: null,
                  text: 'Analyse IA des CV (mode démo, simulée) effectuée',
                },
              ],
            };
            newCand.ai = aiEvaluate(newCand, job);
            CRIT.forEach((k) => {
              newCand.notes[k.k] = newCand.ai.notes[k.k] ?? null;
              newCand.noteSrc[k.k] = newCand.ai.notes[k.k] != null ? 'ia' : null;
            });

            setDb((prev) => ({
              ...prev,
              cands: [...prev.cands, newCand],
              notifs: [
                {
                  id: uid('n'),
                  t: Date.now(),
                  text: `Nouvelle candidature : ${formattedName}`,
                  read: false,
                  to: 'candidatures',
                },
                ...prev.notifs,
              ],
              audit: addAuditEntry(
                prev,
                'Candidat',
                `CV importé : ${formattedName} pour « ${job.title} »`,
                formattedName
              ),
            }));
          }
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, state: 'analysé' } : q))
          );
        }
      }
      if (analyzeAfterImport) {
        showToast(`${itemsToProcess.length} CV importé(s) et analysé(s).`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzePendingQueue = (jobId) => {
    const pending = uploadQueue.filter((q) => q.jobId === jobId && ['attente', 'importé'].includes(q.state));
    if (pending.length) runQueueSimulation(pending, true);
  };

  // ============================================================================
  // DOUBLONS POTENTIELS
  // ============================================================================
  const duplicatePairs = useMemo(() => {
    const out = [];
    for (let i = 0; i < visibleCands.length; i++) {
      for (let j = i + 1; j < visibleCands.length; j++) {
        const a = visibleCands[i];
        const b = visibleCands[j];
        if ((a.dupOk || []).includes(b.id) || (b.dupOk || []).includes(a.id)) continue;
        const reason =
          norm(a.email) === norm(b.email)
            ? 'même e-mail'
            : a.phone && a.phone === b.phone
            ? 'même téléphone'
            : norm(a.name) === norm(b.name)
            ? 'même nom'
            : null;
        if (reason) out.push({ a, b, reason });
      }
    }
    return out;
  }, [visibleCands]);

  const handleKeepBothDuplicates = (idA, idB) => {
    setDb((prev) => ({
      ...prev,
      cands: prev.cands.map((c) => {
        if (c.id === idA) {
          return {
            ...c,
            dupOk: [...(c.dupOk || []), idB],
            history: [...c.history, { t: Date.now(), by: currentUser.id, text: 'Doublon potentiel conservé : dossiers distincts' }],
          };
        }
        if (c.id === idB) {
          return {
            ...c,
            dupOk: [...(c.dupOk || []), idA],
            history: [...c.history, { t: Date.now(), by: currentUser.id, text: 'Doublon potentiel conservé : dossiers distincts' }],
          };
        }
        return c;
      }),
    }));
    showToast('Les deux dossiers sont conservés.');
  };

  const handleMergeDuplicates = (idA, idB) => {
    const a = candOf(idA);
    const b = candOf(idB);
    if (!a || !b) return;
    const [keep, rem] = a.appliedAt <= b.appliedAt ? [a, b] : [b, a];
    setDb((prev) => ({
      ...prev,
      cands: prev.cands
        .filter((x) => x.id !== rem.id)
        .map((x) =>
          x.id === keep.id
            ? {
                ...x,
                skills: [...new Set([...x.skills, ...rem.skills])],
                certs: [...new Set([...(x.certs || []), ...(rem.certs || [])])],
                history: [
                  ...x.history,
                  ...rem.history,
                  {
                    t: Date.now(),
                    by: currentUser.id,
                    text: `Fusion avec le dossier reçu le ${fmtD(rem.appliedAt)} (${rem.email})`,
                  },
                ],
              }
            : x
        ),
      interviews: prev.interviews.map((i) => (i.candId === rem.id ? { ...i, candId: keep.id } : i)),
      evaluations: prev.evaluations.map((e) => (e.candId === rem.id ? { ...e, candId: keep.id } : e)),
      comments: prev.comments.map((m) => (m.candId === rem.id ? { ...m, candId: keep.id } : m)),
      audit: addAuditEntry(prev, 'Candidat', `Fusion de doublon : ${keep.name} conservé`, keep.name),
    }));
    if (selectedCandId === rem.id) setSelectedCandId(keep.id);
    setModalState(null);
    showToast('Dossiers fusionnés.');
  };

  // ============================================================================
  // VUE 1 : ESPACE CANDIDAT PUBLIC (CARRIÈRES)
  // ============================================================================
  if (publicCareersMode) {
    return (
      <PublicCareersPortal
        jobs={db.jobs.filter((j) => j.status === 'Ouverte' && j.deadline >= Date.now() - DAY)}
        onBack={() => setPublicCareersMode(false)}
        onSubmitApplication={(job, formData, file) => {
          if (db.cands.some((c) => c.jobId === job.id && norm(c.email) === norm(formData.email))) {
            showToast('Une candidature avec cette adresse e-mail existe déjà pour ce poste.', 'err');
            return null;
          }
          const newCand = {
            id: uid('c'),
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            city: formData.city || 'Non renseignée',
            jobId: job.id,
            appliedAt: Date.now(),
            status: 'nouvelle',
            eduLevel: Number(formData.eduLevel),
            eduLabel: formData.eduLabel,
            eduField: formData.eduField.toLowerCase(),
            school: formData.school || 'Non précisé',
            skills: formData.skills,
            exps:
              Number(formData.years) > 0
                ? [{ role: 'Expérience déclarée', company: 'Non précisée', years: Number(formData.years), period: '—' }]
                : [],
            years: Number(formData.years) || 0,
            langs: formData.langs,
            certs: [],
            salary: Number(formData.salary) || 0,
            cvFile: file ? { name: file.name, size: file.size } : null,
            source: 'Espace candidat',
            motivationText: formData.motivation,
            notes: {},
            noteSrc: {},
            dupOk: [],
            mails: [],
            history: [
              { t: Date.now(), by: null, text: 'Candidature déposée depuis l’espace candidat' },
              { t: Date.now(), by: null, text: 'Analyse IA des CV (mode démo, simulée) effectuée' },
            ],
          };
          newCand.ai = aiEvaluate(newCand, job);
          CRIT.forEach((k) => {
            newCand.notes[k.k] = newCand.ai.notes[k.k] ?? null;
            newCand.noteSrc[k.k] = newCand.ai.notes[k.k] != null ? 'ia' : null;
          });
          const ackMail = {
            id: uid('ml'),
            kind: 'recu',
            to: [newCand.email],
            subject: `Candidature reçue : ${job.title}`,
            body: `Bonjour ${newCand.name},\n\nNous avons bien reçu votre candidature pour le poste « ${job.title} » et vous en remercions.\n\nNotre équipe va étudier votre dossier.\n\nCordialement,\nL’équipe recrutement\nProTrack ATS`,
            at: Date.now(),
            status: 'Envoi simulé',
          };
          newCand.mails.push(ackMail);

          setDb((prev) => ({
            ...prev,
            cands: [...prev.cands, newCand],
            notifs: [
              {
                id: uid('n'),
                t: Date.now(),
                text: `Nouvelle candidature (espace candidat) : ${newCand.name}`,
                read: false,
                to: 'candidatures',
              },
              ...prev.notifs,
            ],
            audit: addAuditEntry(
              prev,
              'Candidature publique',
              `Candidature de ${newCand.name} pour « ${job.title} »`,
              newCand.name,
              null,
              'Candidat (espace candidat)'
            ),
          }));
          return ackMail;
        }}
        showToast={showToast}
      />
    );
  }

  // ============================================================================
  // VUE 2 : ÉCRAN DE CONNEXION
  // ============================================================================
  if (!currentUser) {
    return (
      <LoginScreen
        users={db.users.filter((u) => u.active)}
        appMode={appMode}
        onSwitchMode={handleSwitchMode}
        onLogin={handleLogin}
        onOpenCareers={() => setPublicCareersMode(true)}
      />
    );
  }

  // ============================================================================
  // VUE 3 : APPLICATION ATS AUTHENTIFIÉE
  // ============================================================================
  const unreadNotifs = db.notifs.filter((n) => !n.read).length;
  const newCandsBadge = visibleCands.filter((c) => c.status === 'nouvelle').length;
  const upcomingIntBadge = visibleInterviews.filter(
    (i) => i.status === 'Programmé' && i.at >= Date.now() - 3600000
  ).length;

  return (
    <div className="min-h-screen flex bg-[#F3F5FB] text-slate-900 font-sans">
      {/* Overlay mobile sidebar */}
      {sideOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-30 lg:hidden"
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* SIDEBAR FIXE BLEU NUIT */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-gradient-to-b from-[#0A1233] to-[#14205A] text-[#C9D3FF] flex flex-col p-4 transition-transform duration-200 ${
          sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-5 text-white">
          <BrandLogo size={36} />
          <div>
            <div className="font-bold text-lg tracking-tight leading-none">ProTrack</div>
            <div className="text-[10.5px] text-blue-300 mt-0.5">Smart Recruitment.</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Navigation principale">
          {allowedRoutes.map((r) => {
            const Icon = r.icon;
            const active = page === r.k;
            const badge =
              r.k === 'candidatures'
                ? newCandsBadge
                : r.k === 'entretiens'
                ? upcomingIntBadge
                : 0;
            return (
              <button
                key={r.k}
                onClick={() => {
                  setPage(r.k);
                  setSideOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition text-left ${
                  active
                    ? 'bg-gradient-to-r from-[#2B55F5] to-[#4F73FF] text-white shadow-lg shadow-blue-600/25'
                    : 'text-[#C9D3FF] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{r.l}</span>
                {badge > 0 && (
                  <span className="px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-white/15 text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 pt-3.5 px-2 border-t border-white/10 text-[11.5px] text-blue-300">
          <div className="font-semibold text-white text-xs truncate">{currentUser.name}</div>
          <div>{ROLES[currentUser.role]}</div>
          <div className="text-[10.5px] text-blue-300/80 mt-0.5">
            {currentUser.role === 'manager' ? 'Accès limité à vos postes' : 'Accès selon votre profil'}
          </div>
        </div>
      </aside>

      {/* COLONNE PRINCIPALE */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Bandeau Mode (Démo / Espace Réel) avec bouton de bascule */}
        <div
          className={`${
            appMode === 'real'
              ? 'bg-gradient-to-r from-emerald-900 to-teal-700'
              : 'bg-gradient-to-r from-slate-900 to-blue-700'
          } text-white text-[11.5px] px-4 py-1.5 flex items-center justify-between gap-3 flex-wrap`}
        >
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="px-2 py-0.5 rounded bg-white/20 font-bold tracking-wider text-[10px]">
              {appMode === 'real' ? 'ESPACE RÉEL' : 'MODE DÉMO'}
            </span>
            <span>
              {appMode === 'real'
                ? 'Environnement de production local : créez vos postes réels et importez vos vrais CV.'
                : 'Données fictives de démonstration. Basculez vers l’espace réel pour utiliser l’ATS avec vos propres données.'}
            </span>
          </div>
          <button
            onClick={() => handleSwitchMode(appMode === 'real' ? 'demo' : 'real')}
            className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-blue-50 font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition mx-auto sm:mx-0 shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            {appMode === 'real' ? 'Revenir au mode démo' : 'Basculer vers l’espace réel'}
          </button>
        </div>

        {/* Barre supérieure collante */}
        <header className="sticky top-0 z-20 bg-[#F3F5FB]/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-7 py-3 flex items-center gap-3">
          <button
            onClick={() => setSideOpen(true)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Recherche globale */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Rechercher un candidat, un poste…"
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
            />
            {globalQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40 max-h-80 overflow-y-auto">
                {searchResults.cands.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Candidats
                    </div>
                    {searchResults.cands.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCandId(c.id);
                          setSelectedCandTab('infos');
                          setGlobalQuery('');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-blue-50 text-left"
                      >
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{c.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {jobOf(c.jobId)?.title} · {ST_MAP[c.status]?.l}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {searchResults.jobs.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      Postes
                    </div>
                    {searchResults.jobs.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          setPage('offres');
                          setGlobalQuery('');
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-blue-50 text-left text-xs"
                      >
                        <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          <b>{j.title}</b> · <span className="text-slate-500">{j.dept}</span>
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {searchResults.cands.length === 0 && searchResults.jobs.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Aucun résultat pour « {globalQuery} »
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'notif' ? null : 'notif')}
              className="relative p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-slate-700"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold grid place-items-center">
                  {unreadNotifs}
                </span>
              )}
            </button>
            {openDropdown === 'notif' && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40">
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Notifications
                  </span>
                  <button
                    onClick={() =>
                      setDb((prev) => ({
                        ...prev,
                        notifs: prev.notifs.map((n) => ({ ...n, read: true })),
                      }))
                    }
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Tout marquer lu
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {db.notifs.slice(0, 10).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setDb((prev) => ({
                          ...prev,
                          notifs: prev.notifs.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                        }));
                        setOpenDropdown(null);
                        if (n.to) setPage(n.to);
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 hover:bg-slate-50 text-left"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.read ? 'bg-transparent' : 'bg-blue-600'
                        }`}
                      />
                      <div className="text-xs">
                        <div className="text-slate-800">{n.text}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{fmtDT(n.t)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Menu Utilisateur */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
              className="flex items-center gap-2.5 p-1 pr-3 rounded-xl border border-slate-200 bg-white hover:border-blue-500"
            >
              <Avatar name={currentUser.name} />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[10.5px] text-slate-500">{ROLES[currentUser.role]}</div>
              </div>
            </button>
            {openDropdown === 'user' && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 text-xs">
                <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-slate-100 truncate">
                  {currentUser.email}
                </div>
                <button
                  onClick={() => {
                    setOpenDropdown(null);
                    setSettingsTab('profil');
                    setPage('parametres');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 font-medium mt-1"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Mon profil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CONTENU DYNAMIQUE DES PAGES */}
        <main className="flex-1 p-4 md:p-7 max-w-[1440px] w-full mx-auto space-y-5">
          {page === 'dashboard' && (
            <DashboardPage
              currentUser={currentUser}
              cands={visibleCands}
              jobs={visibleJobs}
              interviews={visibleInterviews}
              comments={db.comments}
              perms={perms}
              uname={uname}
              onNavigate={setPage}
              onOpenImport={() => setModalState({ type: 'import' })}
            />
          )}

          {page === 'offres' && (
            <JobsPage
              jobs={visibleJobs}
              allCands={db.cands}
              perms={perms}
              onOpenCareers={() => setPublicCareersMode(true)}
              onNewJob={() => setModalState({ type: 'jobForm', job: null })}
              onEditJob={(j) => setModalState({ type: 'jobForm', job: j })}
              onToggleJob={(j) => {
                const isOpen = j.status === 'Ouverte';
                const nextStatus = isOpen ? 'Clôturée' : 'Ouverte';
                setDb((prev) => ({
                  ...prev,
                  jobs: prev.jobs.map((x) => (x.id === j.id ? { ...x, status: nextStatus } : x)),
                  audit: addAuditEntry(
                    prev,
                    'Poste',
                    `Offre ${isOpen ? 'clôturée' : 'rouverte'} : ${j.title}`,
                    j.title
                  ),
                }));
                showToast(`Offre ${isOpen ? 'clôturée' : 'rouverte'}.`);
              }}
              onViewJobCands={(jobId) => {
                setCandFilters((prev) => ({ ...prev, job: jobId }));
                setPage('candidatures');
              }}
            />
          )}

          {page === 'candidatures' && (
            <ApplicationsPage
              cands={visibleCands}
              jobs={visibleJobs}
              filters={candFilters}
              setFilters={setCandFilters}
              settings={db.settings}
              perms={perms}
              duplicatePairs={duplicatePairs}
              onKeepDuplicates={handleKeepBothDuplicates}
              onMergeDuplicates={(a, b) => setModalState({ type: 'mergeDup', a, b })}
              onOpenImport={() => setModalState({ type: 'import' })}
              onOpenCand={(id) => {
                setSelectedCandId(id);
                setSelectedCandTab('infos');
              }}
              onMoveStage={handleMoveStage}
            />
          )}

          {page === 'analyse' && (
            <AnalyzerPage
              jobs={db.jobs}
              cands={db.cands}
              state={analyzerState}
              setState={setAnalyzerState}
              queue={uploadQueue}
              isAnalyzing={isAnalyzing}
              settings={db.settings}
              perms={perms}
              currentUser={currentUser}
              onQueueFiles={handleQueueFiles}
              onAnalyzePending={handleAnalyzePendingQueue}
              onNewJob={() => setModalState({ type: 'jobForm', job: null })}
              onEditJob={(j) => setModalState({ type: 'jobForm', job: j })}
              onUpdateWeights={(jobId, weights) => {
                setDb((prev) => ({
                  ...prev,
                  jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, weights } : j)),
                }));
              }}
              onUpdateCellNote={(candId, critKey, val) => {
                const c = candOf(candId);
                const crit = CRIT.find((x) => x.k === critKey);
                if (!c || !crit) return;
                setDb((prev) => ({
                  ...prev,
                  cands: prev.cands.map((x) =>
                    x.id === candId
                      ? {
                          ...x,
                          notes: { ...x.notes, [critKey]: val },
                          noteSrc: { ...x.noteSrc, [critKey]: val == null ? null : 'rh' },
                          history: [
                            ...x.history,
                            {
                              t: Date.now(),
                              by: currentUser.id,
                              text: `Note « ${crit.l} » modifiée → ${val == null ? 'À évaluer' : val}`,
                            },
                          ],
                        }
                      : x
                  ),
                }));
              }}
              onUpdateThresholds={(hi, lo) => {
                if (lo >= hi) {
                  showToast('Le seuil « à étudier » doit être inférieur au seuil « recommandé ».', 'err');
                  return;
                }
                setDb((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, hi, lo },
                  audit: addAuditEntry(prev, 'Paramètres', `Seuils de classement : ${hi} / ${lo}`),
                }));
                showToast('Seuils mis à jour.');
              }}
              onBatchPreselect={(jobId) => {
                const job = jobOf(jobId);
                if (!job) return;
                const rec = db.cands.filter(
                  (c) =>
                    c.jobId === jobId &&
                    c.status === 'nouvelle' &&
                    levelOf(scoreOf(c, job, db.settings.unrated).score, db.settings).k === 'good'
                );
                if (!rec.length) {
                  showToast('Aucun nouveau profil recommandé à présélectionner.', 'warn');
                  return;
                }
                const ids = new Set(rec.map((c) => c.id));
                setDb((prev) => ({
                  ...prev,
                  cands: prev.cands.map((c) =>
                    ids.has(c.id)
                      ? {
                          ...c,
                          status: 'preselection',
                          history: [
                            ...c.history,
                            {
                              t: Date.now(),
                              by: currentUser.id,
                              text: `Statut : Nouvelle candidature → Présélection (validé par ${currentUser.name})`,
                            },
                          ],
                        }
                      : c
                  ),
                }));
                showToast(`${rec.length} candidat(s) présélectionné(s).`);
              }}
              onOpenCand={(id) => {
                setSelectedCandId(id);
                setSelectedCandTab('infos');
              }}
            />
          )}

          {page === 'classement' && (
            <RankingPage
              jobs={visibleJobs}
              cands={visibleCands}
              state={rankState}
              setState={setRankState}
              settings={db.settings}
              onOpenCand={(id) => {
                setSelectedCandId(id);
                setSelectedCandTab('score');
              }}
            />
          )}

          {page === 'entretiens' && (
            <InterviewsPage
              interviews={visibleInterviews}
              cands={visibleCands}
              jobs={db.jobs}
              users={db.users}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              calSelDay={calSelDay}
              setCalSelDay={setCalSelDay}
              perms={perms}
              uname={uname}
              onNewInterview={(candId = '') => setModalState({ type: 'intForm', interview: null, candId })}
              onEditInterview={(it) => setModalState({ type: 'intForm', interview: it })}
              onReportInterview={(it) => setModalState({ type: 'intReport', interview: it })}
              onCancelInterview={(it) => {
                const c = candOf(it.candId);
                setDb((prev) => ({
                  ...prev,
                  interviews: prev.interviews.map((x) => (x.id === it.id ? { ...x, status: 'Annulé' } : x)),
                  cands: prev.cands.map((x) =>
                    x.id === it.candId
                      ? {
                          ...x,
                          history: [
                            ...x.history,
                            { t: Date.now(), by: currentUser.id, text: `Entretien annulé (${fmtDT(it.at)})` },
                          ],
                        }
                      : x
                  ),
                  audit: addAuditEntry(prev, 'Entretien', `Entretien annulé avec ${c?.name}`, c?.name),
                }));
                showToast('Entretien annulé.');
              }}
            />
          )}

          {page === 'evaluations' && (
            <EvaluationsPage
              cands={visibleCands}
              jobs={db.jobs}
              evaluations={db.evaluations}
              selectedId={evalCandId}
              setSelectedId={setEvalCandId}
              settings={db.settings}
              uname={uname}
              onNewEval={(candId) => setModalState({ type: 'evalForm', candId })}
            />
          )}

          {page === 'collaboration' && (
            <CollaborationPage
              cands={visibleCands}
              jobs={db.jobs}
              users={db.users}
              comments={db.comments}
              evaluations={db.evaluations}
              interviews={visibleInterviews}
              filter={collabFilter}
              setFilter={setCollabFilter}
              currentUser={currentUser}
              uname={uname}
              onPostComment={(candId, type, text) => {
                setDb((prev) => ({
                  ...prev,
                  comments: [
                    ...prev.comments,
                    { id: uid('m'), candId: candId || null, by: currentUser.id, at: Date.now(), type, text },
                  ],
                }));
                showToast('Message publié.');
              }}
              onOpenCand={(id) => {
                setSelectedCandId(id);
                setSelectedCandTab('com');
              }}
            />
          )}

          {page === 'rapports' && (
            <ReportsPage
              jobs={visibleJobs}
              cands={visibleCands}
              interviews={visibleInterviews}
              filters={repFilters}
              setFilters={setRepFilters}
              settings={db.settings}
              currentUser={currentUser}
              onExportCsv={(rows, detailRows) => {
                downloadBlob('protrack-rapport.csv', buildCsvContent([...rows, [], ...detailRows]), 'text/csv;charset=utf-8');
                showToast('Export CSV généré.');
              }}
              onExportPdf={(lines) => {
                downloadBlob('protrack-rapport.pdf', makePdfBytes('ProTrack ATS - Rapport RH', lines), 'application/pdf');
                showToast('Export PDF généré.');
              }}
            />
          )}

          {page === 'audit' && (
            <AuditPage
              audit={db.audit || []}
              users={db.users}
              filters={audFilters}
              setFilters={setAudFilters}
              uname={uname}
              onExportCsv={(rows) => {
                downloadBlob('protrack-audit.csv', buildCsvContent(rows), 'text/csv;charset=utf-8');
                showToast('Journal d’audit exporté.');
              }}
            />
          )}

          {page === 'parametres' && (
            <SettingsPage
              db={db}
              appMode={appMode}
              onSwitchMode={handleSwitchMode}
              currentUser={currentUser}
              perms={perms}
              tab={settingsTab}
              setTab={setSettingsTab}
              onSaveSettings={(nextSettings) => {
                setDb((prev) => ({
                  ...prev,
                  settings: nextSettings,
                  audit: addAuditEntry(
                    prev,
                    'Paramètres',
                    `Seuils modifiés : ${nextSettings.hi}/${nextSettings.lo}`
                  ),
                }));
                showToast('Paramètres enregistrés.');
              }}
              onAddUser={(uData) => {
                if (db.users.some((u) => u.email.toLowerCase() === uData.email.toLowerCase())) {
                  showToast('Cette adresse e-mail est déjà utilisée.', 'err');
                  return false;
                }
                setDb((prev) => ({
                  ...prev,
                  users: [...prev.users, { id: uid('u'), ...uData, pw: 'demo1234', jobIds: [], active: true }],
                  audit: addAuditEntry(prev, 'Utilisateur', `Compte créé : ${uData.name}`, uData.name),
                }));
                showToast('Utilisateur ajouté (mot de passe : demo1234).');
                return true;
              }}
              onUpdateUser={(userId, patch) => {
                setDb((prev) => ({
                  ...prev,
                  users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
                  jobs:
                    patch.jobIds !== undefined
                      ? prev.jobs.map((j) => ({
                          ...j,
                          managerIds:
                            patch.role === 'manager' && patch.jobIds.includes(j.id)
                              ? [...new Set([...j.managerIds, userId])]
                              : j.managerIds.filter((id) => id !== userId),
                        }))
                      : prev.jobs,
                }));
                showToast('Compte utilisateur mis à jour.');
              }}
              onDeleteUser={(userId) => {
                const target = db.users.find((u) => u.id === userId);
                if (!target) return;
                setDb((prev) => ({
                  ...prev,
                  users: prev.users.filter((u) => u.id !== userId),
                  jobs: prev.jobs.map((j) => ({
                    ...j,
                    managerIds: j.managerIds.filter((id) => id !== userId),
                  })),
                  audit: addAuditEntry(prev, 'Utilisateur', `Compte supprimé : ${target.name}`, target.name),
                }));
                showToast('Compte supprimé.');
              }}
              onResetDemo={handleResetDemo}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* TIROIR LATÉRAL : FICHE COMPLÈTE DU CANDIDAT (9 ONGLETS) */}
      {selectedCandId && candOf(selectedCandId) && (
        <CandidateDrawer
          cand={candOf(selectedCandId)}
          job={jobOf(candOf(selectedCandId).jobId)}
          allJobs={db.jobs}
          allCands={db.cands}
          interviews={db.interviews.filter((i) => i.candId === selectedCandId)}
          evaluations={db.evaluations.filter((e) => e.candId === selectedCandId)}
          comments={db.comments.filter((m) => m.candId === selectedCandId)}
          settings={db.settings}
          perms={perms}
          currentUser={currentUser}
          uname={uname}
          tab={selectedCandTab}
          setTab={setSelectedCandTab}
          onClose={() => setSelectedCandId(null)}
          onUpdateCand={(candId, patch, logMsg) => {
            setDb((prev) => ({
              ...prev,
              cands: prev.cands.map((c) =>
                c.id === candId
                  ? {
                      ...c,
                      ...patch,
                      history: [...c.history, { t: Date.now(), by: currentUser.id, text: logMsg }],
                    }
                  : c
              ),
              audit: addAuditEntry(prev, catOfText(logMsg), logMsg, candOf(candId)?.name),
            }));
            showToast('Modification enregistrée.');
          }}
          onShareAnalysis={(c, score) => {
            setDb((prev) => ({
              ...prev,
              comments: [
                ...prev.comments,
                {
                  id: uid('m'),
                  candId: c.id,
                  by: currentUser.id,
                  at: Date.now(),
                  type: 'partage',
                  text: `Résultat d’analyse partagé : ${score}/100 (${levelOf(score, db.settings).l.toLowerCase()}).`,
                },
              ],
            }));
            showToast('Résultat partagé dans Collaboration.');
          }}
          onOpenEvalModal={() => setModalState({ type: 'evalForm', candId: selectedCandId })}
          onOpenIntModal={() => setModalState({ type: 'intForm', interview: null, candId: selectedCandId })}
          onOpenReportModal={(it) => setModalState({ type: 'intReport', interview: it })}
          onAddComment={(text) => {
            setDb((prev) => ({
              ...prev,
              comments: [
                ...prev.comments,
                { id: uid('m'), candId: selectedCandId, by: currentUser.id, at: Date.now(), type: 'comment', text },
              ],
            }));
            showToast('Commentaire publié.');
          }}
          showToast={showToast}
        />
      )}

      {/* MODALES D'ACTION (OFFRES, IMPORT, ENTRETIENS, ÉVALUATIONS, DÉCISION) */}
      {modalState && (
        <ModalManager
          modalState={modalState}
          onClose={() => setModalState(null)}
          db={db}
          visibleJobs={visibleJobs}
          visibleCands={visibleCands}
          uploadQueue={uploadQueue}
          currentUser={currentUser}
          perms={perms}
          uname={uname}
          showToast={showToast}
          onSaveJob={(jobId, data) => {
            if (jobId) {
              setDb((prev) => ({
                ...prev,
                jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, ...data } : j)),
                users: prev.users.map((u) => {
                  if (u.role !== 'manager') return u;
                  const nextIds = u.jobIds.filter((id) => id !== jobId);
                  if (data.managerIds.includes(u.id)) nextIds.push(jobId);
                  return { ...u, jobIds: nextIds };
                }),
                audit: addAuditEntry(prev, 'Poste', `Poste modifié : ${data.title}`, data.title),
              }));
              showToast('Poste mis à jour.');
            } else {
              const newJob = { id: uid('j'), ...data };
              setDb((prev) => ({
                ...prev,
                jobs: [...prev.jobs, newJob],
                users: prev.users.map((u) =>
                  data.managerIds.includes(u.id) ? { ...u, jobIds: [...u.jobIds, newJob.id] } : u
                ),
                audit: addAuditEntry(prev, 'Poste', `Poste créé : ${data.title}`, data.title),
              }));
              setAnalyzerState((prev) => ({ ...prev, jobId: newJob.id }));
              showToast('Poste créé avec succès.');
            }
            setModalState(null);
          }}
          onQueueFiles={handleQueueFiles}
          onSaveInterview={(intId, data, sendMailFlag) => {
            const c = candOf(data.candId);
            const j = jobOf(c.jobId);
            const whenStr = new Date(data.at).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });
            const mailObj = sendMailFlag
              ? {
                  id: uid('ml'),
                  kind: intId ? 'modif' : 'invit',
                  to: [
                    c.email,
                    ...data.people.map((id) => db.users.find((u) => u.id === id)?.email).filter(Boolean),
                  ],
                  subject: `${intId ? 'Entretien modifié : ' : 'Invitation à un entretien : '}${j?.title}`,
                  body: `Bonjour ${c.name},\n\n${
                    intId
                      ? `Les détails de votre entretien pour le poste « ${j?.title} » ont changé.`
                      : `Nous avons le plaisir de vous inviter à un entretien pour le poste « ${j?.title} ».`
                  }\n\nDate : ${whenStr}\nDurée : ${data.dur} minutes\nFormat : ${data.mode}\nIntervenants : ${data.people
                    .map(uname)
                    .join(', ')}\n\nCordialement,\n${currentUser.name}\nProTrack ATS`,
                  at: Date.now(),
                  status: 'Envoi simulé',
                }
              : null;

            if (intId) {
              setDb((prev) => ({
                ...prev,
                interviews: prev.interviews.map((x) =>
                  x.id === intId
                    ? { ...x, ...data, mails: mailObj ? [...(x.mails || []), mailObj] : x.mails || [] }
                    : x
                ),
                cands: prev.cands.map((x) =>
                  x.id === c.id
                    ? {
                        ...x,
                        history: [
                          ...x.history,
                          { t: Date.now(), by: currentUser.id, text: `Entretien modifié : ${fmtDT(data.at)}` },
                        ],
                      }
                    : x
                ),
                audit: addAuditEntry(prev, 'Entretien', `Entretien modifié avec ${c.name}`, c.name),
              }));
              showToast('Entretien modifié.');
            } else {
              const newInt = {
                id: uid('i'),
                ...data,
                jobId: c.jobId,
                status: 'Programmé',
                report: '',
                mails: mailObj ? [mailObj] : [],
              };
              setDb((prev) => ({
                ...prev,
                interviews: [...prev.interviews, newInt],
                cands: prev.cands.map((x) =>
                  x.id === c.id
                    ? {
                        ...x,
                        status: ST_MAP[x.status].rank < 3 ? 'entretien_prog' : x.status,
                        history: [
                          ...x.history,
                          { t: Date.now(), by: currentUser.id, text: `Entretien programmé le ${fmtDT(data.at)}` },
                        ],
                      }
                    : x
                ),
                notifs: [
                  {
                    id: uid('n'),
                    t: Date.now(),
                    text: `Entretien programmé : ${c.name}, ${fmtDT(data.at)}`,
                    read: false,
                    to: 'entretiens',
                  },
                  ...prev.notifs,
                ],
                audit: addAuditEntry(prev, 'Entretien', `Entretien programmé avec ${c.name}`, c.name),
              }));
              showToast('Entretien programmé.' + (sendMailFlag ? ' Invitation e-mail générée (envoi simulé).' : ''));
            }
            setModalState(null);
          }}
          onSaveReport={(intId, reportText) => {
            const it = db.interviews.find((x) => x.id === intId);
            if (!it) return;
            const c = candOf(it.candId);
            setDb((prev) => ({
              ...prev,
              interviews: prev.interviews.map((x) =>
                x.id === intId
                  ? { ...x, report: reportText, status: x.status === 'Programmé' ? 'Réalisé' : x.status }
                  : x
              ),
              cands: prev.cands.map((x) =>
                x.id === c.id
                  ? {
                      ...x,
                      status: ST_MAP[x.status].rank <= 3 && perms.work ? 'entretien_fait' : x.status,
                      history: [
                        ...x.history,
                        { t: Date.now(), by: currentUser.id, text: 'Compte rendu d’entretien enregistré' },
                      ],
                    }
                  : x
              ),
              audit: addAuditEntry(prev, 'Entretien', `Compte rendu enregistré pour ${c.name}`, c.name),
            }));
            setModalState(null);
            showToast('Compte rendu conservé dans la fiche du candidat.');
          }}
          onSaveEvaluation={(candId, notes, comment) => {
            const c = candOf(candId);
            if (!c) return;
            setDb((prev) => ({
              ...prev,
              evaluations: [
                ...prev.evaluations,
                { id: uid('e'), candId, by: currentUser.id, at: Date.now(), notes, comment },
              ],
              cands: prev.cands.map((x) =>
                x.id === candId
                  ? {
                      ...x,
                      status: perms.work && ST_MAP[x.status].rank === 3 ? 'entretien_fait' : x.status,
                      history: [
                        ...x.history,
                        { t: Date.now(), by: currentUser.id, text: `Évaluation ajoutée par ${currentUser.name}` },
                      ],
                    }
                  : x
              ),
              audit: addAuditEntry(prev, 'Notation', `Évaluation ajoutée pour ${c.name}`, c.name),
            }));
            setModalState(null);
            showToast('Évaluation enregistrée.');
          }}
          onFinalDecision={handleFinalDecision}
          onMergeConfirm={handleMergeDuplicates}
        />
      )}

      {/* NOTIFICATIONS TOAST FLOTTANTES */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-[#0A1233] text-white px-4 py-3 rounded-xl shadow-xl flex items-start gap-2.5 text-xs border-l-4 ${
              t.type === 'err'
                ? 'border-rose-500'
                : t.type === 'warn'
                ? 'border-amber-400'
                : 'border-emerald-400'
            }`}
          >
            {t.type === 'err' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS DES PAGES
// ============================================================================
function LoginScreen({ users, appMode, onSwitchMode, onLogin, onOpenCareers }) {
  const [email, setEmail] = useState('admin@protrack.demo');
  const [pw, setPw] = useState('demo1234');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = onLogin(email, pw);
    if (res) setErr(res);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      <section className="bg-gradient-to-br from-[#0A1233] via-[#14205A] to-[#2B55F5] text-white p-8 md:p-14 flex flex-col justify-between gap-8">
        <div className="flex items-center gap-3">
          <BrandLogo size={44} />
          <div>
            <div className="font-bold text-2xl tracking-tight">ProTrack</div>
            <div className="text-xs text-blue-200">Smart Recruitment. Better Decisions.</div>
          </div>
        </div>

        <div className="space-y-5 max-w-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Recrutez avec des décisions éclairées.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Centralisez les candidatures, analysez les CV avec un scoring transparent sur 100 et gardez la décision finale entre les mains de votre équipe.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">Scoring sur 100</span>
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">Kanban de suivi</span>
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">Rôles et droits</span>
          </div>
        </div>

        <p className="text-xs text-blue-200/80">
          Administratrice principale : <b>INSAF EL HAJAJI</b> · Version de démonstration interactive.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Connexion</h2>
              <p className="text-xs text-slate-500 mt-1">
                {appMode === 'real'
                  ? 'Espace Réel actif (administratrice : INSAF EL HAJAJI).'
                  : 'Cliquez sur un profil de démonstration ci-dessous pour explorer chaque rôle.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSwitchMode(appMode === 'real' ? 'demo' : 'real')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition shrink-0 ${
                appMode === 'real'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              {appMode === 'real' ? 'Mode Démo' : 'Espace Réel'}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Adresse e-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            {err && <p className="text-xs text-rose-600 font-medium">{err}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition"
            >
              Se connecter
            </button>
          </form>

          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Comptes de démonstration (mdp : demo1234)
            </div>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPw(u.pw);
                  setErr('');
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-left transition"
              >
                <Avatar name={u.name} />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">{u.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {ROLES[u.role]} · {u.email}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenCareers}
            className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:border-blue-600 text-slate-800 font-semibold text-xs transition"
          >
            Espace candidat : voir les offres et postuler
          </button>
        </div>
      </section>
    </div>
  );
}

function DashboardPage({ currentUser, cands, jobs, interviews, comments, perms, uname, onNavigate, onOpenImport }) {
  const kpis = [
    { l: 'Candidats', v: cands.length, icon: Users },
    { l: 'Postes ouverts', v: jobs.filter((j) => j.status === 'Ouverte').length, icon: Briefcase },
    { l: 'En attente', v: cands.filter((c) => ['nouvelle', 'attente_eval'].includes(c.status)).length, icon: Clock },
    {
      l: 'Entretiens prévus',
      v: interviews.filter((i) => i.status === 'Programmé' && i.at >= Date.now() - 3600000).length,
      icon: CalendarIcon,
    },
    {
      l: 'Présélectionnés',
      v: cands.filter((c) => c.status === 'preselection' || (ST_MAP[c.status]?.rank >= 1 && !['acceptee', 'rejetee'].includes(c.status))).length,
      icon: Check,
    },
    { l: 'Recrutements', v: cands.filter((c) => c.status === 'acceptee').length, icon: Trophy },
  ];

  // Évolution sur 8 semaines
  const weekly = useMemo(() => {
    const arr = Array(8).fill(0);
    const labels = [];
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    for (let i = 0; i < 8; i++) {
      const dt = new Date(end.getTime() - (7 - i) * 7 * DAY);
      labels.push(dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
    }
    cands.forEach((c) => {
      const w = 7 - Math.floor((end.getTime() - c.appliedAt) / (7 * DAY));
      if (w >= 0 && w < 8) arr[w]++;
    });
    return { arr, labels };
  }, [cands]);

  const byStatus = [
    ['nouvelle', 'Nouvelles', '#2563EB'],
    ['preselection', 'Présélection', '#06B6D4'],
    ['attente_eval', 'En attente d’éval.', '#7C3AED'],
    ['entretien_prog', 'Entretien prévu', '#10B981'],
    ['entretien_fait', 'Entretien réalisé', '#F59E0B'],
    ['decision', 'Décision finale', '#EA580C'],
    ['acceptee', 'Acceptées', '#059669'],
    ['rejetee', 'Rejetées', '#E11D48'],
  ]
    .map(([k, l, color]) => ({ l, v: cands.filter((x) => x.status === k).length, color }))
    .filter((x) => x.v > 0);

  const byJob = jobs.map((j) => ({ l: j.title, v: cands.filter((c) => c.jobId === j.id).length }));
  const mxJob = Math.max(1, ...byJob.map((x) => x.v));

  const recentFeed = useMemo(() => {
    const list = [];
    cands.forEach((c) =>
      c.history.forEach((h) => {
        if (!/Analyse IA/.test(h.text)) {
          list.push({ t: h.t, text: `${c.name} · ${h.text}`, by: h.by });
        }
      })
    );
    comments.forEach((m) =>
      list.push({ t: m.at, text: `${uname(m.by)} a publié un commentaire`, by: m.by })
    );
    return list.sort((a, b) => b.t - a.t).slice(0, 8);
  }, [cands, comments, uname]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Bonjour, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Voici l’état de vos recrutements aujourd’hui.</p>
        </div>
        {perms.work && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('analyse')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-xs font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              Analyser des CV
            </button>
            <button
              onClick={onOpenImport}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Upload className="w-4 h-4" />
              Importer des CV
            </button>
          </div>
        )}
      </div>

      {/* 6 Cartes KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{k.l}</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">{k.v}</div>
            </div>
          );
        })}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-slate-900">Évolution des candidatures</h2>
            <span className="text-[11px] text-slate-400">8 dernières semaines</span>
          </div>
          <LineChartSVG vals={weekly.arr} labels={weekly.labels} />
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h2 className="font-bold text-sm text-slate-900 mb-3">Répartition par statut</h2>
          <DonutSVG items={byStatus} />
        </div>
      </div>

      {/* Candidats par poste & Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h2 className="font-bold text-sm text-slate-900">Candidats par poste</h2>
          {byJob.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[140px_1fr_36px] items-center gap-3 text-xs">
              <span className="truncate text-slate-700 font-medium">{item.l}</span>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${(item.v / mxJob) * 100}%` }}
                />
              </div>
              <b className="text-right tabular-nums">{item.v}</b>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
          <h2 className="font-bold text-sm text-slate-900">Activité récente</h2>
          <div className="divide-y divide-slate-100">
            {recentFeed.map((ev, i) => (
              <div key={i} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-700 truncate">
                  {ev.text} {ev.by && <span className="text-slate-400">par {uname(ev.by)}</span>}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0">{fmtDT(ev.t)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobsPage({ jobs, allCands, perms, onOpenCareers, onNewJob, onEditJob, onToggleJob, onViewJobCands }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Offres d’emploi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {jobs.length} poste(s) · {jobs.filter((j) => j.status === 'Ouverte').length} ouvert(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onOpenCareers}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-xs font-semibold flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            Voir l’espace candidat
          </button>
          {perms.manageJobs && (
            <button
              onClick={onNewJob}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Créer un poste
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {jobs.map((j) => {
          const count = allCands.filter((c) => c.jobId === j.id).length;
          return (
            <article key={j.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base text-slate-900">{j.title}</h2>
                  <div className="text-xs text-slate-500">{j.dept}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    j.status === 'Ouverte'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : j.status === 'Brouillon'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {j.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{j.desc}</p>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-400">Formation</dt>
                <dd className="text-slate-800">{j.eduReq}</dd>
                <dt className="text-slate-400">Expérience</dt>
                <dd className="text-slate-800">{j.expYears} an(s)</dd>
                <dt className="text-slate-400">Disponibilité</dt>
                <dd className="text-slate-800">{j.availability}</dd>
                <dt className="text-slate-400">Date limite</dt>
                <dd className="text-slate-800">{fmtD(j.deadline)}</dd>
              </dl>

              <div className="flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => onViewJobCands(j.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {count} candidat(s)
                </button>
                {perms.manageJobs && (
                  <>
                    <button
                      onClick={() => onEditJob(j)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => onToggleJob(j)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        j.status === 'Ouverte'
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                          : 'border-slate-200 text-slate-700 hover:border-blue-500'
                      }`}
                    >
                      {j.status === 'Ouverte' ? 'Clôturer' : 'Rouvrir'}
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationsPage({
  cands,
  jobs,
  filters,
  setFilters,
  settings,
  perms,
  duplicatePairs,
  onKeepDuplicates,
  onMergeDuplicates,
  onOpenImport,
  onOpenCand,
  onMoveStage,
}) {
  const [draggedCandId, setDraggedCandId] = useState(null);

  const allSkills = useMemo(() => [...new Set(cands.flatMap((c) => c.skills))].sort(), [cands]);

  const filtered = useMemo(() => {
    const q = norm(filters.q);
    return cands
      .filter((c) => {
        if (filters.job && c.jobId !== filters.job) return false;
        if (filters.status && c.status !== filters.status) return false;
        if (filters.skill && !c.skills.includes(filters.skill)) return false;
        if (filters.exp === '0' && c.years > 1) return false;
        if (filters.exp === '2' && (c.years < 2 || c.years > 4)) return false;
        if (filters.exp === '5' && c.years < 5) return false;
        if (q && !norm([c.name, c.email, c.school, c.eduLabel, c.city, c.skills.join(' ')].join(' ')).includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.appliedAt - a.appliedAt);
  }, [cands, filters]);

  const dupIds = useMemo(() => new Set(duplicatePairs.flatMap((p) => [p.a.id, p.b.id])), [duplicatePairs]);
  const jobMap = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);

  const kanbanCols = [...STAGES.slice(0, 6), { k: 'final', l: 'Acceptée / Rejetée' }];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Candidatures</h1>
          <p className="text-xs text-slate-500 mt-0.5">Centralisez, filtrez et suivez chaque dossier.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-slate-200/70 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilters((p) => ({ ...p, view: 'list' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                filters.view === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Liste
            </button>
            <button
              onClick={() => setFilters((p) => ({ ...p, view: 'kanban' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                filters.view === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Suivi Kanban
            </button>
          </div>
          {perms.work && (
            <button
              onClick={onOpenImport}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Upload className="w-4 h-4" />
              Importer des CV
            </button>
          )}
        </div>
      </div>

      {/* Bannière de détection des doublons */}
      {duplicatePairs.length > 0 && perms.work && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 text-xs">
            <div className="font-bold text-amber-900">
              {duplicatePairs.length} doublon(s) potentiel(s) détecté(s)
            </div>
            {duplicatePairs.map((p, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-slate-800">
                <span>
                  <b>{p.a.name}</b> et <b>{p.b.name}</b> ({p.reason}) · {jobMap[p.a.jobId]?.title}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onMergeDuplicates(p.a, p.b)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:border-blue-500 font-semibold flex items-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-blue-600" />
                    Fusionner
                  </button>
                  <button
                    onClick={() => onKeepDuplicates(p.a.id, p.b.id)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-400 font-semibold"
                  >
                    Conserver les deux
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres multicritères */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Recherche</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="Nom, école, compétence…"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Poste</label>
          <select
            value={filters.job}
            onChange={(e) => setFilters((p) => ({ ...p, job: e.target.value }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tous les postes</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Compétence</label>
          <select
            value={filters.skill}
            onChange={(e) => setFilters((p) => ({ ...p, skill: e.target.value }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Toutes</option>
            {allSkills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Expérience</label>
          <select
            value={filters.exp}
            onChange={(e) => setFilters((p) => ({ ...p, exp: e.target.value }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Toutes</option>
            <option value="0">0 à 1 an</option>
            <option value="2">2 à 4 ans</option>
            <option value="5">5 ans et +</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Statut</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tous</option>
            {STAGES.map((s) => (
              <option key={s.k} value={s.k}>
                {s.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vue Liste */}
      {filters.view === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Candidat</th>
                <th className="py-3 px-4">Poste</th>
                <th className="py-3 px-4">Formation</th>
                <th className="py-3 px-4">Exp.</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Reçue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const j = jobMap[c.jobId];
                const sc = scoreOf(c, j, settings.unrated);
                return (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCand(c.id)}
                    className="hover:bg-blue-50/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {c.name}
                            {dupIds.has(c.id) && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Doublon
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{j?.title}</td>
                    <td className="py-3 px-4 text-slate-600">{c.eduLabel}</td>
                    <td className="py-3 px-4 tabular-nums">{c.years} an(s)</td>
                    <td className="py-3 px-4">
                      <ScoreBadge score={sc.score} complete={sc.complete} settings={settings} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">{fmtD(c.appliedAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Aucun candidat trouvé avec ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Vue Kanban Glisser-Déposer */
        <div className="flex gap-3.5 overflow-x-auto pb-4">
          {kanbanCols.map((col) => {
            const items = filtered.filter((c) =>
              col.k === 'final' ? ['acceptee', 'rejetee'].includes(c.status) : c.status === col.k
            );
            return (
              <div
                key={col.k}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCandId) {
                    onMoveStage(draggedCandId, col.k);
                    setDraggedCandId(null);
                  }
                }}
                className="w-60 shrink-0 bg-slate-100/80 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2.5 min-h-[320px]"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>{col.l}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px]">
                    {items.length}
                  </span>
                </div>
                {items.map((c) => {
                  const j = jobMap[c.jobId];
                  const sc = scoreOf(c, j, settings.unrated);
                  return (
                    <div
                      key={c.id}
                      draggable={perms.work}
                      onDragStart={() => setDraggedCandId(c.id)}
                      onClick={() => onOpenCand(c.id)}
                      className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-3 shadow-xs cursor-pointer space-y-2 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{c.name}</div>
                          <div className="text-[10.5px] text-slate-500 truncate">{j?.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <ScoreBadge score={sc.score} complete={sc.complete} settings={settings} />
                        {col.k === 'final' && <StatusPill status={c.status} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyzerPage({
  jobs,
  cands,
  state,
  setState,
  queue,
  isAnalyzing,
  settings,
  perms,
  onQueueFiles,
  onAnalyzePending,
  onNewJob,
  onEditJob,
  onUpdateWeights,
  onUpdateCellNote,
  onUpdateThresholds,
  onBatchPreselect,
  onOpenCand,
}) {
  const job = jobs.find((j) => j.id === state.jobId) || jobs[0];
  const [localWeights, setLocalWeights] = useState(job ? job.weights : DEFW());
  const [hi, setHi] = useState(settings.hi);
  const [lo, setLo] = useState(settings.lo);

  useEffect(() => {
    if (job) setLocalWeights(job.weights);
  }, [job]);

  useEffect(() => {
    setHi(settings.hi);
    setLo(settings.lo);
  }, [settings]);

  if (!job) return null;

  const weightSum = Object.values(localWeights).reduce((a, b) => a + Number(b || 0), 0);
  const STEPS = [
    'Création du poste',
    'Paramétrage du scoring',
    'Importation des CV',
    'Analyse automatique',
    'Calcul des scores',
    'Classement',
  ];

  const jobQueue = queue.filter((q) => q.jobId === job.id);
  const pendingCount = jobQueue.filter((q) => ['attente', 'importé'].includes(q.state)).length;
  const jobCands = cands
    .filter((c) => c.jobId === job.id)
    .map((c) => ({ c, ...scoreOf(c, job, settings.unrated) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">AI Resume Analyzer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Six étapes guidées, de la définition du poste au classement des candidats.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
          Mode démonstration : analyse simulée
        </span>
      </div>

      {/* Stepper 6 étapes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const active = state.step === stepNum;
          const done = state.step > stepNum;
          return (
            <button
              key={stepNum}
              onClick={() => {
                if (state.step === 2 && stepNum > 2 && weightSum !== 100) return;
                setState((p) => ({ ...p, step: stepNum }));
              }}
              className={`p-3 rounded-xl border text-left transition ${
                active
                  ? 'border-blue-600 bg-blue-50/80'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div
                className={`text-[10.5px] font-bold uppercase tracking-wider ${
                  active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                Étape {stepNum} {done && '· ✓'}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{label}</div>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'étape active */}
      {state.step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-base">Poste à pourvoir</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={job.id}
                onChange={(e) => setState((p) => ({ ...p, jobId: e.target.value }))}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <button
                onClick={onNewJob}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau poste
              </button>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
            <div>
              <dt className="text-slate-400">Intitulé</dt>
              <dd className="font-bold text-slate-900">
                {job.title} · {job.dept}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Formation exigée</dt>
              <dd className="font-medium">{job.eduReq}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Compétences</dt>
              <dd className="font-medium">{job.skills.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Expérience</dt>
              <dd className="font-medium">{job.expYears} an(s)</dd>
            </div>
          </dl>
          <button
            onClick={() => onEditJob(job)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier le poste
          </button>
        </div>
      )}

      {state.step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-base">Pondérations des six critères · {job.title}</h2>
          <p className="text-xs text-slate-500">
            La somme des pondérations doit être strictement égale à 100 % pour passer à l’étape suivante.
          </p>
          <div className="max-w-md space-y-2.5">
            {CRIT.map((c) => (
              <div key={c.k} className="flex items-center justify-between gap-4 text-xs">
                <label className="font-medium text-slate-700">{c.l}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localWeights[c.k] ?? 0}
                    onChange={(e) => {
                      const next = { ...localWeights, [c.k]: Number(e.target.value) || 0 };
                      setLocalWeights(next);
                      const sum = Object.values(next).reduce((a, b) => a + b, 0);
                      if (sum === 100) onUpdateWeights(job.id, next);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-bold"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-bold">
              <span>Total</span>
              <span className={weightSum === 100 ? 'text-emerald-600' : 'text-rose-600'}>{weightSum} %</span>
            </div>
          </div>
          <button
            onClick={() => {
              const def = DEFW();
              setLocalWeights(def);
              onUpdateWeights(job.id, def);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-blue-500 text-xs font-semibold"
          >
            Rétablir les valeurs par défaut (25/30/20/10/5/10)
          </button>
        </div>
      )}

      {state.step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-base">Importer jusqu’à 50 CV (PDF) pour « {job.title} »</h2>
          <label className="border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition">
            <Upload className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-bold text-slate-900">Glissez-déposez vos CV (PDF) ou cliquez pour parcourir</span>
            <span className="text-xs text-slate-500 mt-1">50 fichiers maximum · 10 Mo par fichier</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                onQueueFiles(e.target.files, job.id, false);
                e.target.value = '';
              }}
            />
          </label>
          {jobQueue.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">{jobQueue.length} fichier(s) dans la file</div>
              {jobQueue.map((q) => (
                <div key={q.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-medium truncate">{q.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{q.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-base">Analyse automatique des CV</h2>
            <button
              disabled={pendingCount === 0 || isAnalyzing}
              onClick={() => onAnalyzePending(job.id)}
              className="px-4 py-2 rounded-xl bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? 'Analyse en cours…' : `Lancer l’analyse (${pendingCount} en attente)`}
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 px-3">Candidat</th>
                  <th className="py-2.5 px-3">Formation</th>
                  <th className="py-2.5 px-3">Compétences</th>
                  <th className="py-2.5 px-3">Exp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobCands.map(({ c }) => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCand(c.id)}
                    className="hover:bg-blue-50/50 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-bold">{c.name}</td>
                    <td className="py-2.5 px-3">{c.eduLabel}</td>
                    <td className="py-2.5 px-3">{c.skills.join(', ') || '—'}</td>
                    <td className="py-2.5 px-3">{c.years} an(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.step === 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-base">Notes et scores · {job.title}</h2>
          <p className="text-xs text-slate-500">
            Modifiez directement une note de 0 à 10 : le score global se recalcule instantanément.
          </p>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2.5 px-3">Candidat</th>
                  {CRIT.map((k) => (
                    <th key={k.k} className="py-2.5 px-2 text-center">
                      {k.l.split(' ')[0]} ({job.weights[k.k]}%)
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Score /100</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobCands.map(({ c, score, complete }) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-bold">
                      <button onClick={() => onOpenCand(c.id)} className="text-blue-600 hover:underline">
                        {c.name}
                      </button>
                    </td>
                    {CRIT.map((k) => {
                      const val = c.notes[k.k];
                      return (
                        <td key={k.k} className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={val ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === '' ? null : Math.max(0, Math.min(10, Number(raw)));
                              onUpdateCellNote(c.id, k.k, next);
                            }}
                            className={`w-14 px-1.5 py-1 text-center rounded-lg border text-xs font-semibold ${
                              val == null ? 'border-dashed border-amber-300 bg-amber-50' : 'border-slate-200'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right">
                      <ScoreBadge score={score} complete={complete} settings={settings} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.step === 6 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-base">Classement final · {job.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                Recommandé dès
                <input
                  type="number"
                  value={hi}
                  onChange={(e) => setHi(Number(e.target.value))}
                  onBlur={() => onUpdateThresholds(hi, lo)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold"
                />
              </label>
              <label className="flex items-center gap-1.5">
                À étudier dès
                <input
                  type="number"
                  value={lo}
                  onChange={(e) => setLo(Number(e.target.value))}
                  onBlur={() => onUpdateThresholds(hi, lo)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold"
                />
              </label>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {jobCands.map(({ c, score, complete }, idx) => (
              <div
                key={c.id}
                onClick={() => onOpenCand(c.id)}
                className="py-3 flex items-center justify-between gap-4 hover:bg-blue-50/50 px-2 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-extrabold text-blue-600">{idx + 1}</span>
                  <Avatar name={c.name} />
                  <div>
                    <div className="text-xs font-bold">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.eduLabel} · {c.years} an(s)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={c.status} />
                  <ScoreBadge score={score} complete={complete} settings={settings} />
                </div>
              </div>
            ))}
          </div>

          {perms.work && (
            <button
              onClick={() => onBatchPreselect(job.id)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Présélectionner les profils recommandés
            </button>
          )}
        </div>
      )}

      {/* Navigation Précédent / Suivant */}
      <div className="flex items-center justify-between">
        <button
          disabled={state.step === 1}
          onClick={() => setState((p) => ({ ...p, step: p.step - 1 }))}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>
        {state.step < 6 && (
          <button
            disabled={state.step === 2 && weightSum !== 100}
            onClick={() => setState((p) => ({ ...p, step: p.step + 1 }))}
            className="px-4 py-2 rounded-xl bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function RankingPage({ jobs, cands, state, setState, settings, onOpenCand }) {
  const job = jobs.find((j) => j.id === state.jobId) || jobs[0];
  if (!job) return <div className="p-8 text-center text-sm text-slate-500">Aucun poste disponible.</div>;

  const ranked = cands
    .filter((c) => c.jobId === job.id)
    .map((c) => ({ c, ...scoreOf(c, job, settings.unrated) }))
    .sort((a, b) => b.score - a.score);

  const filtered = ranked.filter((x) => !state.level || levelOf(x.score, settings).k === state.level);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Classement des candidats</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Du meilleur score au plus faible, selon les pondérations du poste.
          </p>
        </div>
        <select
          value={job.id}
          onChange={(e) => setState((p) => ({ ...p, jobId: e.target.value }))}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <span>
          Le classement est une aide à la décision. La décision finale de recrutement appartient aux personnes habilitées.
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ≥ {settings.hi} · Recommandé
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {settings.lo} à {settings.hi - 1} · À étudier
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              &lt; {settings.lo} · Rejet proposé
            </span>
          </div>
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              ['', 'Tous'],
              ['good', 'Recommandés'],
              ['warn', 'À étudier'],
              ['bad', 'Rejet proposé'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setState((p) => ({ ...p, level: k }))}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  state.level === k ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((item) => {
            const lv = levelOf(item.score, settings);
            const rankNum = ranked.indexOf(item) + 1;
            return (
              <div
                key={item.c.id}
                onClick={() => onOpenCand(item.c.id)}
                className="py-3.5 px-2 flex flex-wrap items-center justify-between gap-4 hover:bg-blue-50/50 rounded-xl cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className={`w-7 text-center font-extrabold ${rankNum <= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                    #{rankNum}
                  </span>
                  <Avatar name={item.c.name} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.c.eduLabel} · {item.c.years} an(s)
                    </div>
                  </div>
                </div>

                <div className="hidden md:block w-48">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lv.k === 'good' ? 'bg-emerald-500' : lv.k === 'warn' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-1">{lv.l}</div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <StatusPill status={item.c.status} />
                  <span className="text-lg font-extrabold text-slate-900 tabular-nums w-12 text-right">
                    {item.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InterviewsPage({
  interviews,
  cands,
  jobs,
  calMonth,
  setCalMonth,
  calSelDay,
  setCalSelDay,
  perms,
  uname,
  onNewInterview,
  onEditInterview,
  onReportInterview,
  onCancelInterview,
}) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ date: new Date(year, month, 1 - firstDay + i), out: true });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i), out: false });
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month, daysInMonth + cells.length - firstDay - daysInMonth + 1), out: true });
  }

  const todayIso = isoDay(Date.now());
  const candMap = Object.fromEntries(cands.map((c) => [c.id, c]));
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  const displayedList = calSelDay
    ? interviews.filter((i) => isoDay(i.at) === calSelDay).sort((a, b) => a.at - b.at)
    : interviews.slice().sort((a, b) => b.at - a.at).slice(0, 12);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Entretiens</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Planifiez, suivez et conservez les comptes rendus dans chaque fiche.
          </p>
        </div>
        {perms.work && (
          <button
            onClick={() => onNewInterview('')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Programmer un entretien
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendrier mensuel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalMonth(new Date(year, month - 1, 1))}
              className="p-2 rounded-xl border border-slate-200 hover:border-blue-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-sm capitalize">
              {calMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => setCalMonth(new Date(year, month + 1, 1))}
              className="p-2 rounded-xl border border-slate-200 hover:border-blue-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => (
              <div key={d} className="text-[11px] font-bold uppercase text-slate-400 py-1">
                {d}
              </div>
            ))}
            {cells.map((cell, idx) => {
              const iso = isoDay(cell.date);
              const evs = interviews.filter((i) => isoDay(i.at) === iso && i.status !== 'Annulé');
              const selected = calSelDay === iso;
              const isToday = iso === todayIso;
              return (
                <button
                  key={idx}
                  onClick={() => setCalSelDay(selected ? null : iso)}
                  className={`aspect-square rounded-xl border p-1.5 flex flex-col justify-between text-left transition ${
                    cell.out ? 'opacity-35' : ''
                  } ${selected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200 hover:border-blue-400'} ${
                    isToday ? 'ring-2 ring-blue-500/30' : ''
                  }`}
                >
                  <span className="text-xs font-semibold">{cell.date.getDate()}</span>
                  <div className="flex flex-wrap gap-1">
                    {evs.map((e) => (
                      <span
                        key={e.id}
                        className={`w-2 h-2 rounded-full ${e.at < Date.now() ? 'bg-slate-400' : 'bg-blue-600'}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {calSelDay && (
            <button
              onClick={() => setCalSelDay(null)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Afficher tous les entretiens
            </button>
          )}
        </div>

        {/* Liste des entretiens */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="font-bold text-sm text-slate-900">
            {calSelDay ? `Entretiens du ${calSelDay}` : 'Entretiens programmés et récents'}
          </h2>
          {displayedList.map((i) => {
            const c = candMap[i.candId];
            if (!c) return null;
            return (
              <div key={i.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{c.name}</div>
                    <div className="text-slate-500">{jobMap[i.jobId]?.title}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      i.status === 'Réalisé'
                        ? 'bg-emerald-50 text-emerald-700'
                        : i.status === 'Annulé'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {i.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-slate-600">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                    {fmtDT(i.at)} ({i.dur} min)
                  </span>
                  <span className="flex items-center gap-1">
                    {i.mode === 'Présentiel' ? (
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    {i.mode}
                  </span>
                </div>
                <div className="text-slate-500">Intervenants : {i.people.map(uname).join(', ')}</div>

                {i.report && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <b>Compte rendu :</b> {i.report}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => onReportInterview(i)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Compte rendu
                  </button>
                  {perms.work && i.status !== 'Annulé' && (
                    <>
                      <button
                        onClick={() => onEditInterview(i)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 font-semibold"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => onCancelInterview(i)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {displayedList.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              Aucun entretien à afficher.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvaluationsPage({ cands, jobs, evaluations, selectedId, setSelectedId, settings, uname, onNewEval }) {
  const activeCands = cands.filter((c) => c.status !== 'rejetee').sort((a, b) => a.name.localeCompare(b.name));
  const currentId = activeCands.some((c) => c.id === selectedId) ? selectedId : activeCands[0]?.id;
  const cand = activeCands.find((c) => c.id === currentId);
  if (!cand) return <div className="p-8 text-center text-sm text-slate-500">Aucun candidat à évaluer.</div>;

  const job = jobs.find((j) => j.id === cand.jobId);
  const candEvals = evaluations.filter((e) => e.candId === cand.id).sort((a, b) => b.at - a.at);
  const sc = scoreOf(cand, job, settings.unrated);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Évaluations</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Grille d’évaluation comparative par poste, avec auteur et date de chaque avis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-2.5 max-h-[70vh] overflow-y-auto space-y-1">
          {activeCands.map((x) => {
            const cnt = evaluations.filter((e) => e.candId === x.id).length;
            return (
              <button
                key={x.id}
                onClick={() => setSelectedId(x.id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition ${
                  x.id === cand.id ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar name={x.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{x.name}</div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    {jobs.find((j) => j.id === x.jobId)?.title}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10.5px] font-bold">{cnt}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-slate-900">{cand.name}</h2>
                <p className="text-xs text-slate-500">
                  {job?.title} · Score global actuel : <b>{sc.score}/100</b>
                </p>
              </div>
              <button
                onClick={() => onNewEval(cand.id)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nouvelle évaluation
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                    <th className="py-2.5 px-3">Critère</th>
                    <th className="py-2.5 px-3">Poids</th>
                    {candEvals.map((e) => (
                      <th key={e.id} className="py-2.5 px-3">
                        {uname(e.by).split(' ')[0]}
                        <div className="text-[10px] font-normal lowercase">{fmtD(e.at)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRIT.map((k) => (
                    <tr key={k.k}>
                      <td className="py-2.5 px-3 font-medium">{k.l}</td>
                      <td className="py-2.5 px-3">{job?.weights[k.k]} %</td>
                      {candEvals.map((e) => (
                        <td key={e.id} className="py-2.5 px-3 font-bold">
                          {e.notes[k.k] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="py-2.5 px-3">
                      Total pondéré /100
                    </td>
                    {candEvals.map((e) => (
                      <td key={e.id} className="py-2.5 px-3 text-blue-600">
                        {evTotal(e.notes, job) ?? '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {candEvals.map((e) => (
            <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={uname(e.by)} size="sm" />
                  <b>{uname(e.by)}</b>
                  <span className="text-slate-400">· {fmtD(e.at)}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                  {evTotal(e.notes, job)} / 100
                </span>
              </div>
              {e.comment && <p className="text-slate-700">{e.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollaborationPage({
  cands,
  jobs,
  users,
  comments,
  evaluations,
  interviews,
  filter,
  setFilter,
  uname,
  onPostComment,
  onOpenCand,
}) {
  const [candId, setCandId] = useState('');
  const [type, setType] = useState('comment');
  const [text, setText] = useState('');

  const ids = new Set(cands.map((c) => c.id));
  const candMap = Object.fromEntries(cands.map((c) => [c.id, c]));
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  let feed = [];
  comments
    .filter((m) => !m.candId || ids.has(m.candId))
    .forEach((m) => feed.push({ t: m.at, type: m.type, by: m.by, cand: m.candId, text: m.text }));
  evaluations
    .filter((e) => ids.has(e.candId))
    .forEach((e) =>
      feed.push({
        t: e.at,
        type: 'avis',
        by: e.by,
        cand: e.candId,
        text: `Évaluation : ${evTotal(e.notes, jobMap[candMap[e.candId]?.jobId])}/100. ${e.comment || ''}`,
      })
    );
  interviews
    .filter((i) => i.report && ids.has(i.candId))
    .forEach((i) =>
      feed.push({
        t: i.at,
        type: 'cr',
        by: i.people[0],
        cand: i.candId,
        text: 'Compte rendu d’entretien : ' + i.report,
      })
    );

  if (filter !== 'all') feed = feed.filter((x) => x.type === filter);
  feed.sort((a, b) => b.t - a.t);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Collaboration</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Partagez profils, analyses, avis et comptes rendus avec les responsables concernés.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              onPostComment(candId, type, text.trim());
              setText('');
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">À propos de</label>
                <select
                  value={candId}
                  onChange={(e) => setCandId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Général (équipe)</option>
                  {cands.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {jobMap[c.jobId]?.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="comment">Commentaire</option>
                  <option value="avis">Avis</option>
                  <option value="partage">Partage de profil</option>
                </select>
              </div>
            </div>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Votre message pour l’équipe…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 min-h-[72px]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Publier
              </button>
            </div>
          </form>

          <div className="inline-flex flex-wrap bg-slate-200/70 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              ['all', 'Tout'],
              ['comment', 'Commentaires'],
              ['avis', 'Avis'],
              ['cr', 'Comptes rendus'],
              ['partage', 'Partages'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  filter === k ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {feed.map((x, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
                <Avatar name={uname(x.by)} />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{uname(x.by)}</b>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-semibold">
                      {x.type}
                    </span>
                    {x.cand && candMap[x.cand] && (
                      <button
                        onClick={() => onOpenCand(x.cand)}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        {candMap[x.cand].name}
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">{fmtDT(x.t)}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{x.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 self-start space-y-3 text-xs">
          <h2 className="font-bold text-sm text-slate-900">Droits d’accès de l’équipe</h2>
          {users
            .filter((u) => u.active)
            .map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 py-1">
                <Avatar name={u.name} size="sm" />
                <div>
                  <div className="font-bold">{u.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {ROLES[u.role]} ·{' '}
                    {u.role === 'manager'
                      ? u.jobIds.map((id) => jobMap[id]?.title).filter(Boolean).join(', ') || 'aucun poste'
                      : 'tous les postes'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ jobs, cands, interviews, filters, setFilters, settings, currentUser, onExportCsv, onExportPdf }) {
  const since = filters.period === 'all' ? 0 : Date.now() - Number(filters.period) * DAY;
  const scopedJobs = filters.job ? jobs.filter((j) => j.id === filters.job) : jobs;
  const scopedCands = cands.filter((c) => scopedJobs.some((j) => j.id === c.jobId) && c.appliedAt >= since);
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  const scores = scopedCands.map((c) => scoreOf(c, jobMap[c.jobId], settings.unrated).score);
  const avgScore = scores.length ? r1(scores.reduce((a, b) => a + b, 0) / scores.length) : '—';
  const hired = scopedCands.filter((c) => c.status === 'acceptee');
  const avgDelay = hired.length
    ? Math.round(hired.reduce((a, c) => a + ((c.decidedAt || Date.now()) - c.appliedAt) / DAY, 0) / hired.length)
    : null;

  const summaryRows = scopedJobs.map((j) => {
    const jc = scopedCands.filter((c) => c.jobId === j.id);
    const jScores = jc.map((c) => scoreOf(c, j, settings.unrated).score);
    return [
      j.title,
      jc.length,
      jc.filter((c) => ST_MAP[c.status]?.rank >= 1 && c.status !== 'rejetee').length,
      interviews.filter((i) => i.jobId === j.id && i.status !== 'Annulé').length,
      jc.filter((c) => c.status === 'acceptee').length,
      jScores.length ? r1(jScores.reduce((a, b) => a + b, 0) / jScores.length) : '—',
    ];
  });

  const buckets = [
    ['0 – 24', 0, 25, '#E11D48'],
    ['25 – 49', 25, 50, '#F59E0B'],
    ['50 – 74', 50, 75, '#06B6D4'],
    ['75 – 100', 75, 101, '#10B981'],
  ].map(([l, a, b, color]) => ({ l, v: scores.filter((s) => s >= a && s < b).length, color }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Rapports et statistiques</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculés dynamiquement à partir des données réelles de l’application.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() =>
              onExportPdf([
                `Édité le ${new Date().toLocaleDateString('fr-FR')} par ${currentUser.name}`,
                '',
                `Candidatures : ${scopedCands.length}`,
                `Recrutements : ${hired.length}`,
                `Score moyen : ${avgScore}/100`,
                '',
                ...summaryRows.map((r) => `${r[0]} : ${r[1]} cand., ${r[4]} recrut., score moyen ${r[5]}`),
              ])
            }
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" />
            PDF
          </button>
          <button
            onClick={() =>
              onExportCsv(
                [['Poste', 'Candidatures', 'Présélectionnés', 'Entretiens', 'Recrutements', 'Score moyen'], ...summaryRows],
                [
                  ['Candidat', 'Poste', 'Statut', 'Score'],
                  ...scopedCands.map((c) => [
                    c.name,
                    jobMap[c.jobId]?.title,
                    ST_MAP[c.status]?.l,
                    scoreOf(c, jobMap[c.jobId], settings.unrated).score,
                  ]),
                ]
              )
            }
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Excel (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Période</label>
          <select
            value={filters.period}
            onChange={(e) => setFilters((p) => ({ ...p, period: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">Toute la période</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="365">12 derniers mois</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Poste</label>
          <select
            value={filters.job}
            onChange={(e) => setFilters((p) => ({ ...p, job: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tous les postes</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs text-slate-500 font-semibold">Candidatures</div>
          <div className="text-2xl font-extrabold mt-1">{scopedCands.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs text-slate-500 font-semibold">Recrutements</div>
          <div className="text-2xl font-extrabold mt-1">{hired.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs text-slate-500 font-semibold">Délai moyen</div>
          <div className="text-2xl font-extrabold mt-1">{avgDelay == null ? '—' : `${avgDelay} j`}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs text-slate-500 font-semibold">Score moyen</div>
          <div className="text-2xl font-extrabold mt-1">{avgScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-sm mb-3">Répartition par score</h2>
          <DonutSVG items={buckets} totalLabel="profils" />
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 overflow-x-auto">
          <h2 className="font-bold text-sm mb-3">Détail par poste</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                <th className="py-2.5 px-3">Poste</th>
                <th className="py-2.5 px-3">Candidatures</th>
                <th className="py-2.5 px-3">Présélection</th>
                <th className="py-2.5 px-3">Entretiens</th>
                <th className="py-2.5 px-3">Recrutés</th>
                <th className="py-2.5 px-3">Score moyen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((r, i) => (
                <tr key={i}>
                  {r.map((val, idx) => (
                    <td key={idx} className={`py-2.5 px-3 ${idx === 0 ? 'font-bold' : 'tabular-nums'}`}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditPage({ audit, users, filters, setFilters, uname, onExportCsv }) {
  const since = filters.period === 'all' ? 0 : Date.now() - Number(filters.period) * DAY;
  const q = norm(filters.q);

  const filtered = audit
    .filter(
      (x) =>
        x.t >= since &&
        (!filters.user || x.by === filters.user) &&
        (!filters.cat || x.cat === filters.cat) &&
        (!q || norm(`${x.text} ${x.target} ${x.by ? uname(x.by) : x.who || 'Système'}`).includes(q))
    )
    .sort((a, b) => b.t - a.t);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Journal d’audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace immuable des actions importantes effectuées dans ProTrack ATS.
          </p>
        </div>
        <button
          onClick={() =>
            onExportCsv([
              ['Date', 'Utilisateur', 'Catégorie', 'Action', 'Cible'],
              ...filtered.map((x) => [
                fmtDT(x.t),
                x.by ? uname(x.by) : x.who || 'Système',
                x.cat,
                x.text,
                x.target,
              ]),
            ])
          }
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-blue-600" />
          Exporter en CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Recherche</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="Action, personne, cible…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Utilisateur</label>
          <select
            value={filters.user}
            onChange={(e) => setFilters((p) => ({ ...p, user: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tous</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Catégorie</label>
          <select
            value={filters.cat}
            onChange={(e) => setFilters((p) => ({ ...p, cat: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Toutes</option>
            {AUDCATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-500 mb-1">Période</label>
          <select
            value={filters.period}
            onChange={(e) => setFilters((p) => ({ ...p, period: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">Tout</option>
            <option value="1">24 heures</option>
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Utilisateur</th>
              <th className="py-3 px-4">Catégorie</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Cible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 200).map((x) => (
              <tr key={x.id}>
                <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{fmtDT(x.t)}</td>
                <td className="py-2.5 px-4 font-medium">{x.by ? uname(x.by) : x.who || 'Système'}</td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                    {x.cat}
                  </span>
                </td>
                <td className="py-2.5 px-4">{x.text}</td>
                <td className="py-2.5 px-4 text-slate-500">{x.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({
  db,
  appMode,
  onSwitchMode,
  currentUser,
  perms,
  tab,
  setTab,
  onSaveSettings,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetDemo,
  showToast,
}) {
  const [hi, setHi] = useState(db.settings.hi);
  const [lo, setLo] = useState(db.settings.lo);
  const [unrated, setUnrated] = useState(db.settings.unrated);
  const [autoMail, setAutoMail] = useState(db.settings.autoMail !== false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('rh');

  const tabs = [
    ['profil', 'Mon profil'],
    ...(perms.work ? [['scoring', 'Scoring et seuils']] : []),
    ...(perms.manageUsers ? [['users', 'Utilisateurs']] : []),
    ['data', 'Espace Réel & Démo'],
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">Paramètres</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'profil' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 max-w-xl text-xs">
          <div className="flex items-center gap-4">
            <Avatar name={currentUser.name} size="lg" />
            <div>
              <h2 className="font-bold text-lg text-slate-900">{currentUser.name}</h2>
              <div className="text-slate-500">{currentUser.email}</div>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                {ROLES[currentUser.role]}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'scoring' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 max-w-xl text-xs">
          <h2 className="font-bold text-base">Seuils de classement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Profil recommandé dès (≥)</label>
              <input
                type="number"
                value={hi}
                onChange={(e) => setHi(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Profil à étudier dès (≥)</label>
              <input
                type="number"
                value={lo}
                onChange={(e) => setLo(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={autoMail} onChange={(e) => setAutoMail(e.target.checked)} />
              Envoyer automatiquement les invitations et notifications par e-mail (simulé en démo)
            </label>
            <label className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                checked={unrated === 'zero'}
                onChange={() => setUnrated('zero')}
              />
              Critères non notés = 0 point (score provisoire)
            </label>
            <label className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                checked={unrated === 'normalize'}
                onChange={() => setUnrated('normalize')}
              />
              Ramener le score sur les seuls critères notés
            </label>
          </div>

          <button
            onClick={() => {
              if (lo >= hi) {
                showToast('Le seuil « à étudier » doit être inférieur au seuil « recommandé ».', 'err');
                return;
              }
              onSaveSettings({ hi, lo, unrated, autoMail });
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Enregistrer les paramètres
          </button>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim() || !newEmail.trim()) return;
              if (onAddUser({ name: newName.trim(), email: newEmail.trim(), role: newRole })) {
                setNewName('');
                setNewEmail('');
              }
            }}
            className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end"
          >
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Nom complet</label>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Rôle</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {Object.entries(ROLES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Actif</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4">
                      <b>{u.name}</b>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        disabled={u.id === currentUser.id}
                        value={u.role}
                        onChange={(e) => onUpdateUser(u.id, { role: e.target.value })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {Object.entries(ROLES).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        disabled={u.id === currentUser.id}
                        checked={u.active}
                        onChange={(e) => onUpdateUser(u.id, { active: e.target.checked })}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Supprimer le compte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 max-w-2xl text-xs">
          <div className="space-y-2">
            <h2 className="font-bold text-base text-slate-900">Basculer entre le Mode Démonstration et l’Espace Réel</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos deux environnements sont sauvegardés séparément. L’<strong>Espace Réel</strong> démarre avec une base propre administrée par <strong>INSAF EL HAJAJI</strong> afin d’y créer vos véritables offres d’emploi et d’importer vos propres CV.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => onSwitchMode('real')}
                disabled={appMode === 'real'}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {appMode === 'real' ? 'Espace Réel actif' : 'Basculer vers l’Espace Réel'}
              </button>
              <button
                onClick={() => onSwitchMode('demo')}
                disabled={appMode === 'demo'}
                className="px-4 py-2.5 rounded-xl border border-slate-300 disabled:opacity-40 bg-white hover:border-blue-500 text-slate-800 font-bold inline-flex items-center gap-2"
              >
                {appMode === 'demo' ? 'Mode Démonstration actif' : 'Revenir au Mode Démonstration'}
              </button>
            </div>
          </div>

          {appMode === 'demo' && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Réinitialiser le jeu de démonstration</h3>
              <p className="text-slate-600 leading-relaxed">
                Restaure les 26 candidats fictifs, 5 postes, 8 entretiens et évaluations d’origine.
              </p>
              <button
                onClick={onResetDemo}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser les données de démonstration
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TIROIR LATÉRAL : FICHE CANDIDAT À 9 ONGLETS
// ============================================================================
function CandidateDrawer({
  cand,
  job,
  allJobs,
  allCands,
  interviews,
  evaluations,
  comments,
  settings,
  perms,
  uname,
  tab,
  setTab,
  onClose,
  onUpdateCand,
  onShareAnalysis,
  onOpenEvalModal,
  onOpenIntModal,
  onOpenReportModal,
  onAddComment,
  showToast,
}) {
  const [form, setForm] = useState({
    name: cand.name,
    email: cand.email,
    phone: cand.phone,
    city: cand.city,
    jobId: cand.jobId,
    salary: cand.salary || '',
  });
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    setForm({
      name: cand.name,
      email: cand.email,
      phone: cand.phone,
      city: cand.city,
      jobId: cand.jobId,
      salary: cand.salary || '',
    });
  }, [cand]);

  const sc = scoreOf(cand, job, settings.unrated);
  const lv = levelOf(sc.score, settings);
  const jobRanking = allCands
    .filter((c) => c.jobId === cand.jobId)
    .map((c) => ({ c, s: scoreOf(c, job, settings.unrated).score }))
    .sort((a, b) => b.s - a.s);
  const pos = jobRanking.findIndex((x) => x.c.id === cand.id) + 1;
  const ai = cand.ai || aiEvaluate(cand, job);
  const allMails = [
    ...(cand.mails || []),
    ...interviews.flatMap((i) => i.mails || []),
  ].sort((a, b) => b.at - a.at);

  const TABS = [
    ['infos', 'Informations'],
    ['cv', 'CV'],
    ['ia', 'Analyse IA'],
    ['score', 'Score et classement'],
    ['hist', 'Historique'],
    ['eval', 'Évaluations'],
    ['ent', 'Entretiens'],
    ['mail', 'E-mails'],
    ['com', 'Commentaires'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[#F3F5FB] h-full overflow-y-auto p-5 md:p-7 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 font-semibold flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
          <span className="text-slate-400">Dossier reçu le {fmtD(cand.appliedAt)}</span>
        </div>

        {/* En-tête fiche */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={cand.name} size="lg" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{cand.name}</h1>
              <p className="text-xs text-slate-500">
                {job?.title} · {cand.city}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <StatusPill status={cand.status} />
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  Classement : {pos} sur {jobRanking.length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {sc.score}
              <span className="text-sm text-slate-400 font-semibold">/100</span>
            </div>
            <ScoreBadge score={sc.score} complete={sc.complete} settings={settings} />
          </div>
        </div>

        {/* Onglets */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Contenu des 9 onglets */}
        {tab === 'infos' && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateCand(
                  cand.id,
                  { ...form, salary: Number(form.salary) || 0 },
                  'Informations personnelles mises à jour'
                );
              }}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Nom complet</label>
                  <input
                    disabled={!perms.work}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">E-mail</label>
                  <input
                    disabled={!perms.work}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Téléphone</label>
                  <input
                    disabled={!perms.work}
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Ville</label>
                  <input
                    disabled={!perms.work}
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Poste</label>
                  <select
                    disabled={!perms.work}
                    value={form.jobId}
                    onChange={(e) => setForm((p) => ({ ...p, jobId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {allJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Prétentions (MAD / mois)</label>
                  <input
                    type="number"
                    disabled={!perms.work}
                    value={form.salary}
                    onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              {perms.work && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Enregistrer
                </button>
              )}
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-sm">Formation & Langues</h3>
                <p>
                  {cand.eduLabel} · <span className="text-slate-500">{cand.school}</span>
                </p>
                <p className="text-slate-600">Langues : {cand.langs.join(', ')}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-sm">Compétences & Expérience ({cand.years} an(s))</h3>
                <div className="flex flex-wrap gap-1.5">
                  {cand.skills.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'cv' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Aperçu et téléchargement du CV</h2>
              <button
                onClick={() => {
                  const bytes = makePdfBytes('Curriculum Vitae - ' + cand.name, [
                    `${cand.email} | ${cand.phone} | ${cand.city}`,
                    '',
                    'Formation : ' + cand.eduLabel + ' (' + cand.school + ')',
                    'Compétences : ' + cand.skills.join(', '),
                    'Expérience : ' + cand.years + ' an(s)',
                  ]);
                  downloadBlob(`CV_${norm(cand.name).replace(/ /g, '_')}.pdf`, bytes, 'application/pdf');
                  showToast('CV téléchargé en PDF.');
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-lg font-extrabold">{cand.name}</div>
              <div className="text-slate-500">
                {cand.email} · {cand.phone} · {cand.city}
              </div>
              <hr className="border-slate-200 my-2" />
              <div>
                <b>Formation :</b> {cand.eduLabel} — {cand.school}
              </div>
              <div>
                <b>Compétences :</b> {cand.skills.join(' · ') || '—'}
              </div>
              <div>
                <b>Expériences :</b>{' '}
                {cand.exps.map((e) => `${e.role} chez ${e.company} (${e.years} an(s))`).join(' ; ') || '—'}
              </div>
            </div>
          </div>
        )}

        {tab === 'ia' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-base">Notes par critère (modifiables)</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                    <th className="py-2 px-3">Critère</th>
                    <th className="py-2 px-3">Pondération</th>
                    <th className="py-2 px-3">Note /10</th>
                    <th className="py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRIT.map((k) => {
                    const v = cand.notes[k.k];
                    const src = cand.noteSrc[k.k];
                    return (
                      <tr key={k.k}>
                        <td className="py-2 px-3 font-medium">{k.l}</td>
                        <td className="py-2 px-3">{job?.weights[k.k]} %</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            disabled={!perms.work}
                            value={v ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const next = e.target.value === '' ? null : Math.max(0, Math.min(10, Number(e.target.value)));
                              onUpdateCand(
                                cand.id,
                                {
                                  notes: { ...cand.notes, [k.k]: next },
                                  noteSrc: { ...cand.noteSrc, [k.k]: next == null ? null : 'rh' },
                                },
                                `Note « ${k.l} » modifiée → ${next == null ? 'À évaluer' : next}`
                              );
                            }}
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-bold"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              src === 'ia'
                                ? 'bg-blue-50 text-blue-700'
                                : src === 'rh'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {src === 'ia' ? 'IA (simulée)' : src === 'rh' ? 'Saisie RH' : 'À évaluer'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-emerald-700">Points forts</h3>
                <ul className="list-disc pl-4 space-y-1">
                  {ai.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-amber-700">Points à vérifier</h3>
                <ul className="list-disc pl-4 space-y-1">
                  {ai.verify.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => onShareAnalysis(cand, sc.score)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-500 font-semibold inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              Partager le résultat avec l’équipe
            </button>
          </div>
        )}

        {tab === 'score' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
            <h2 className="font-bold text-base">Détail du calcul pondéré</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-2 px-3">Critère</th>
                  <th className="py-2 px-3">Note /10</th>
                  <th className="py-2 px-3">Pondération</th>
                  <th className="py-2 px-3">Points obtenus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CRIT.map((k) => {
                  const v = cand.notes[k.k];
                  const w = job?.weights[k.k] || 0;
                  return (
                    <tr key={k.k}>
                      <td className="py-2 px-3 font-medium">{k.l}</td>
                      <td className="py-2 px-3">{v ?? 'À évaluer'}</td>
                      <td className="py-2 px-3">{w} %</td>
                      <td className="py-2 px-3 font-bold">{v == null ? '—' : r1((v / 10) * w)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-extrabold text-sm">
                  <td colSpan={3} className="py-2.5 px-3">
                    Score global
                  </td>
                  <td className="py-2.5 px-3 text-blue-600">{sc.score} / 100</td>
                </tr>
              </tbody>
            </table>
            <div className="text-slate-500">Interprétation : <b>{lv.l}</b></div>
          </div>
        )}

        {tab === 'hist' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <h2 className="font-bold text-base">Chronologie complète du dossier</h2>
            <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
              {cand.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <div key={i} className="relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[21px] top-1" />
                    <div className="font-semibold text-slate-800">{h.text}</div>
                    <div className="text-[11px] text-slate-400">
                      {fmtDT(h.t)} · {uname(h.by)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'eval' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Évaluations des intervenants ({evaluations.length})</h2>
              <button
                onClick={onOpenEvalModal}
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ajouter une évaluation
              </button>
            </div>
            {evaluations.map((e) => (
              <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <b>{uname(e.by)}</b>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                    {evTotal(e.notes, job)} / 100
                  </span>
                </div>
                <p className="text-slate-600">{e.comment || 'Aucun commentaire.'}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'ent' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Entretiens ({interviews.length})</h2>
              {perms.work && (
                <button
                  onClick={onOpenIntModal}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Programmer un entretien
                </button>
              )}
            </div>
            {interviews.map((i) => (
              <div key={i.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <b>
                    {fmtDT(i.at)} · {i.mode} ({i.dur} min)
                  </b>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">{i.status}</span>
                </div>
                <div className="text-slate-500">Intervenants : {i.people.map(uname).join(', ')}</div>
                {i.report && <p className="p-2.5 rounded-xl bg-slate-50">{i.report}</p>}
                <button
                  onClick={() => onOpenReportModal(i)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 font-semibold"
                >
                  Compte rendu
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'mail' && (
          <div className="space-y-3 text-xs">
            <h2 className="font-bold text-base">Historique des e-mails générés ({allMails.length})</h2>
            {allMails.map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <b>{m.subject}</b>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{m.status}</span>
                </div>
                <div className="text-slate-400">
                  À : {m.to.join(', ')} · {fmtDT(m.at)}
                </div>
                <pre className="whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                  {m.body}
                </pre>
              </div>
            ))}
            {allMails.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
                Aucun e-mail généré pour ce dossier.
              </div>
            )}
          </div>
        )}

        {tab === 'com' && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                onAddComment(commentText.trim());
                setCommentText('');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <textarea
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire sur ce candidat…"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 min-h-[70px]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Publier
              </button>
            </form>
            {comments.map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <b>{uname(m.by)}</b>
                  <span className="text-slate-400">{fmtDT(m.at)}</span>
                </div>
                <p className="text-slate-700">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PORTAIL PUBLIC CANDIDATS (CARRIÈRES)
// ============================================================================
function PublicCareersPortal({ jobs, onBack, onSubmitApplication, showToast }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [ackMail, setAckMail] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    eduLevel: '3',
    eduLabel: '',
    eduField: '',
    school: '',
    years: '2',
    skills: [],
    langs: ['Arabe', 'Français'],
    salary: '',
    motivation: '',
  });
  const [cvFile, setCvFile] = useState(null);

  return (
    <div className="min-h-screen bg-[#F3F5FB]">
      <header className="bg-gradient-to-br from-[#0A1233] to-[#2B55F5] text-white py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size={36} />
              <span className="font-bold text-xl">ProTrack Carrières</span>
            </div>
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Espace recruteur
            </button>
          </div>
          <h1 className="text-3xl font-extrabold">Nos offres d’emploi</h1>
          <p className="text-blue-100 text-sm max-w-2xl">
            Consultez les postes ouverts et déposez votre candidature en quelques minutes.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((j) => (
            <article key={j.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-base text-slate-900">{j.title}</h2>
                  <div className="text-xs text-slate-500">
                    {j.dept} · Clôture le {fmtD(j.deadline)}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                  Ouverte
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{j.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-2">
                <button
                  onClick={() => {
                    setSelectedJob(j);
                    setAckMail(null);
                    setForm((p) => ({ ...p, skills: [] }));
                    setCvFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Postuler à cette offre
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Modale de candidature publique */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs grid place-items-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-bold text-base">Postuler : {selectedJob.title}</h2>
                <button onClick={() => setSelectedJob(null)} className="p-1.5 rounded-lg border border-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {ackMail ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                    Votre candidature a bien été enregistrée et transmise à l’équipe recrutement.
                  </div>
                  <pre className="whitespace-pre-wrap font-sans p-4 rounded-xl bg-slate-50 border border-slate-200">
                    {ackMail.body}
                  </pre>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cvFile) {
                      showToast('Veuillez joindre votre CV au format PDF.', 'err');
                      return;
                    }
                    const mail = onSubmitApplication(selectedJob, form, cvFile);
                    if (mail) setAckMail(mail);
                  }}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nom complet *</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Téléphone *</label>
                      <input
                        required
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Ville</label>
                      <input
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Niveau d’études *</label>
                      <select
                        value={form.eduLevel}
                        onChange={(e) => setForm((p) => ({ ...p, eduLevel: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="1">Bac</option>
                        <option value="2">Bac+2</option>
                        <option value="3">Bac+3 (Licence)</option>
                        <option value="4">Bac+5 (Master / Ingénieur)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Intitulé du diplôme *</label>
                      <input
                        required
                        value={form.eduLabel}
                        onChange={(e) => setForm((p) => ({ ...p, eduLabel: e.target.value }))}
                        placeholder="Ex. Master en finance"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Domaine *</label>
                      <input
                        required
                        value={form.eduField}
                        onChange={(e) => setForm((p) => ({ ...p, eduField: e.target.value }))}
                        placeholder="Ex. comptabilité, informatique"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Années d’expérience *</label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        required
                        value={form.years}
                        onChange={(e) => setForm((p) => ({ ...p, years: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Compétences maîtrisées</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills.map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.skills.includes(s)}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                skills: e.target.checked
                                  ? [...p.skills, s]
                                  : p.skills.filter((x) => x !== s),
                              }))
                            }
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">CV au format PDF (max 10 Mo) *</label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size > 10 * 1048576) {
                          showToast('Le fichier dépasse 10 Mo.', 'err');
                          e.target.value = '';
                          return;
                        }
                        setCvFile(f || null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
                    >
                      Envoyer ma candidature
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// GESTIONNAIRE DE MODALES
// ============================================================================
function ModalManager({
  modalState,
  onClose,
  db,
  visibleJobs,
  visibleCands,
  uploadQueue,
  uname,
  showToast,
  onSaveJob,
  onQueueFiles,
  onSaveInterview,
  onSaveReport,
  onSaveEvaluation,
  onFinalDecision,
  onMergeConfirm,
}) {
  // États locaux des formulaires modaux
  const job = modalState.type === 'jobForm' ? modalState.job : null;
  const [jForm, setJForm] = useState({
    title: job?.title || '',
    dept: job?.dept || 'Finance',
    desc: job?.desc || '',
    eduReq: job?.eduReq || 'Bac+3',
    eduLevel: job?.eduLevel ?? 3,
    eduFields: (job?.eduFields || ['gestion']).join(', '),
    skills: (job?.skills || []).join(', '),
    expYears: job?.expYears ?? 2,
    availability: job?.availability || '1 mois',
    deadline: isoDay(job?.deadline || Date.now() + 21 * DAY),
    status: job?.status || 'Ouverte',
    managerIds: job?.managerIds || [],
  });

  const [impJobId, setImpJobId] = useState(visibleJobs[0]?.id || 'j1');

  const itv = modalState.type === 'intForm' ? modalState.interview : null;
  const initDt = new Date(itv?.at || Date.now() + DAY);
  const [iForm, setIForm] = useState({
    candId: itv?.candId || modalState.candId || visibleCands[0]?.id || '',
    date: isoDay(initDt),
    time: `${String(initDt.getHours()).padStart(2, '0')}:${String(initDt.getMinutes()).padStart(2, '0')}`,
    dur: itv?.dur || 45,
    mode: itv?.mode || 'Visioconférence',
    people: itv?.people || ['u1', 'u2'],
    sendMail: true,
  });

  const [repText, setRepText] = useState(modalState.interview?.report || '');

  const evalCand = modalState.type === 'evalForm' ? visibleCands.find((c) => c.id === modalState.candId) : null;
  const [eNotes, setENotes] = useState({
    formation: 7,
    competences: 7,
    experience: 7,
    motivation: 7,
    disponibilite: 7,
    salaire: 7,
  });
  const [eComment, setEComment] = useState('');

  const [decVal, setDecVal] = useState('acceptee');
  const [decMail, setDecMail] = useState(true);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs grid place-items-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs shadow-2xl">
        {/* 1. Formulaire Poste */}
        {modalState.type === 'jobForm' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">{job ? 'Modifier le poste' : 'Créer un poste'}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const skills = jForm.skills
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean);
                const eduFields = jForm.eduFields
                  .split(',')
                  .map((x) => x.trim().toLowerCase())
                  .filter(Boolean);
                onSaveJob(job?.id || null, {
                  title: jForm.title.trim(),
                  dept: jForm.dept.trim(),
                  desc: jForm.desc.trim(),
                  eduReq: jForm.eduReq.trim(),
                  eduLevel: Number(jForm.eduLevel),
                  eduFields: eduFields.length ? eduFields : ['gestion'],
                  skills,
                  expYears: Number(jForm.expYears),
                  availability: jForm.availability,
                  published: job?.published || Date.now(),
                  deadline: new Date(`${jForm.deadline}T23:59:00`).getTime(),
                  status: jForm.status,
                  weights: job?.weights || DEFW(),
                  managerIds: jForm.managerIds,
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Intitulé *</label>
                  <input
                    required
                    value={jForm.title}
                    onChange={(e) => setJForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Département *</label>
                  <input
                    required
                    value={jForm.dept}
                    onChange={(e) => setJForm((p) => ({ ...p, dept: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Description *</label>
                <textarea
                  required
                  value={jForm.desc}
                  onChange={(e) => setJForm((p) => ({ ...p, desc: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 min-h-[70px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Diplôme exigé</label>
                  <input
                    value={jForm.eduReq}
                    onChange={(e) => setJForm((p) => ({ ...p, eduReq: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Expérience (ans)</label>
                  <input
                    type="number"
                    min="0"
                    value={jForm.expYears}
                    onChange={(e) => setJForm((p) => ({ ...p, expYears: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Compétences (séparées par des virgules)</label>
                <input
                  value={jForm.skills}
                  onChange={(e) => setJForm((p) => ({ ...p, skills: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </>
        )}

        {/* 2. Importation rapide de CV */}
        {modalState.type === 'import' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Importer des CV (PDF)</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Poste concerné</label>
              <select
                value={impJobId}
                onChange={(e) => setImpJobId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {visibleJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer">
              <Upload className="w-7 h-7 text-blue-600 mb-1.5" />
              <span className="font-bold">Sélectionner un ou plusieurs fichiers PDF</span>
              <span className="text-slate-500 mt-1">Analyse automatique lancée après l’import</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  onQueueFiles(e.target.files, impJobId, true);
                  e.target.value = '';
                }}
              />
            </label>
            {uploadQueue.filter((q) => q.jobId === impJobId).length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {uploadQueue
                  .filter((q) => q.jobId === impJobId)
                  .map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="truncate">{q.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">{q.state}</span>
                    </div>
                  ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                Fermer
              </button>
            </div>
          </>
        )}

        {/* 3. Programmer / Modifier un entretien */}
        {modalState.type === 'intForm' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">{itv ? 'Modifier l’entretien' : 'Programmer un entretien'}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const start = new Date(`${iForm.date}T${iForm.time}`).getTime();
                const end = start + Number(iForm.dur) * 60000;
                const conflict = db.interviews.find((x) => {
                  if ((itv && x.id === itv.id) || x.status === 'Annulé') return false;
                  const xs = x.at;
                  const xe = x.at + x.dur * 60000;
                  return start < xe && end > xs && (x.candId === iForm.candId || x.people.some((p) => iForm.people.includes(p)));
                });
                if (conflict) {
                  showToast('Conflit horaire détecté sur ce créneau.', 'err');
                  return;
                }
                onSaveInterview(
                  itv?.id || null,
                  {
                    candId: iForm.candId,
                    at: start,
                    dur: Number(iForm.dur),
                    mode: iForm.mode,
                    people: iForm.people,
                  },
                  iForm.sendMail
                );
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Candidat</label>
                <select
                  value={iForm.candId}
                  onChange={(e) => setIForm((p) => ({ ...p, candId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {visibleCands.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={iForm.date}
                    onChange={(e) => setIForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Heure</label>
                  <input
                    type="time"
                    required
                    value={iForm.time}
                    onChange={(e) => setIForm((p) => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Durée</label>
                  <select
                    value={iForm.dur}
                    onChange={(e) => setIForm((p) => ({ ...p, dur: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Format</label>
                  <select
                    value={iForm.mode}
                    onChange={(e) => setIForm((p) => ({ ...p, mode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option>Visioconférence</option>
                    <option>Présentiel</option>
                    <option>Téléphone</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Intervenants</label>
                <div className="flex flex-wrap gap-2">
                  {db.users
                    .filter((u) => u.active)
                    .map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={iForm.people.includes(u.id)}
                          onChange={(e) =>
                            setIForm((p) => ({
                              ...p,
                              people: e.target.checked
                                ? [...p.people, u.id]
                                : p.people.filter((x) => x !== u.id),
                            }))
                          }
                        />
                        {u.name}
                      </label>
                    ))}
                </div>
              </div>
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={iForm.sendMail}
                  onChange={(e) => setIForm((p) => ({ ...p, sendMail: e.target.checked }))}
                />
                Envoyer l’invitation par e-mail (simulé en démonstration)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </>
        )}

        {/* 4. Compte rendu d'entretien */}
        {modalState.type === 'intReport' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Compte rendu d’entretien</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveReport(modalState.interview.id, repText.trim());
              }}
              className="space-y-3"
            >
              <textarea
                required
                value={repText}
                onChange={(e) => setRepText(e.target.value)}
                placeholder="Observations, points forts, réserves, recommandations…"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 min-h-[120px]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </>
        )}

        {/* 5. Nouvelle évaluation */}
        {modalState.type === 'evalForm' && evalCand && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Évaluer : {evalCand.name}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEvaluation(evalCand.id, eNotes, eComment.trim());
              }}
              className="space-y-3"
            >
              {CRIT.map((k) => (
                <div key={k.k} className="flex items-center justify-between">
                  <label className="font-medium">{k.l}</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    required
                    value={eNotes[k.k]}
                    onChange={(e) => setENotes((p) => ({ ...p, [k.k]: Number(e.target.value) }))}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-bold"
                  />
                </div>
              ))}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Commentaire général</label>
                <textarea
                  value={eComment}
                  onChange={(e) => setEComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 min-h-[75px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                  Enregistrer
                </button>
              </div>
            </form>
          </>
        )}

        {/* 6. Décision finale */}
        {modalState.type === 'decide' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Décision finale</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  checked={decVal === 'acceptee'}
                  onChange={() => setDecVal('acceptee')}
                />
                Accepter la candidature
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  checked={decVal === 'rejetee'}
                  onChange={() => setDecVal('rejetee')}
                />
                Rejeter la candidature
              </label>
              <label className="flex items-center gap-2 text-slate-600 pt-2">
                <input
                  type="checkbox"
                  checked={decMail}
                  onChange={(e) => setDecMail(e.target.checked)}
                />
                Informer le candidat par e-mail (simulé)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                  Annuler
                </button>
                <button
                  onClick={() => onFinalDecision(modalState.candId, decVal, decMail)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
                >
                  Confirmer la décision
                </button>
              </div>
            </div>
          </>
        )}

        {/* 7. Confirmation fusion de doublons */}
        {modalState.type === 'mergeDup' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base">Fusionner deux dossiers</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Cette action regroupera les compétences, certifications et l’historique de{' '}
              <b>{modalState.a.name}</b> et <b>{modalState.b.name}</b> dans un seul dossier.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold">
                Annuler
              </button>
              <button
                onClick={() => onMergeConfirm(modalState.a.id, modalState.b.id)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Fusionner les dossiers
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}