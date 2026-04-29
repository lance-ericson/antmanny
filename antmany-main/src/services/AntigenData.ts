import DatabaseService from '../services/DatabaseService';

  // export const ANTIGEN_MANUFACTURERS = [
  //   "ALBA",
  //   "ALBAcyte",
  //   "Ortho",
  //   "BioTest",
  //   "Immucor",
  //   "Medion",
  //   "Grifols",
  //   "Quotient",
  //   "Bio-Rad",
  // ] as const;

    export const ANTIGEN_MANUFACTURERS = [
    "Create New",
    "ALBA",
    "ORTHO",
    "BIOTEST",
    "IMMUCOR",
    "MEDION",
    "GRIFOLS",
    "QUOTIENT",
    "BIO-RAD",
  ];

  export const DEFAULT_GROUP_ORDER = [
    "Rh-hr", 
    "KELL", 
    "DUFFY", 
    "KIDD", 
    "LEWIS", 
    "MNS", 
    "P", 
    "LUTHERAN", 
    "SEX", 
    "COLTON", 
    "DIEGO", 
    "Additonal Antigens", 
  ];

    export const ORTHO_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "KIDD",
    "SEX",
    "LEWIS",
    "MNS",
    "P",
    "LUTHERAN",
    "Others Special"
  ];

    export const BIOTEST_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "LUTHERAN",
    "KIDD",
    "MNS",
    "LEWIS",
    "P",
    "SEX",
    "COLTON",
    "DIEGO",
    "Additonal Antigens",
  ];

    export const IMMUCOR_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "KIDD",
    "LEWIS",
    "P",
    "MNS",
    "LUTHERAN",
    "SEX",
    "Additonal Antigens",
  ];

    export const MEDION_GROUP_ORDER = [
    "Rh-hr",
    "MNS",
    "P",
    "LEWIS",
    "LUTHERAN",
    "KELL",
    "DUFFY",
    "KIDD",
    "SEX",
    "Additonal Antigens",
  ];

    export const QUOTIENT_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "KIDD",
    "LEWIS",
    "MNS",
    "P",
    "LUTHERAN",
    "SEX",
    "COLTON",
    "DIEGO",
    "Additonal Antigens",
  ];

    export const BIORAD_GRIFOLS_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "KIDD",
    "LEWIS",
    "P",
    "MNS",
    "LUTHERAN",
    "DIEGO",
    "Additonal Antigens",
  ];

    export const ALBA_GROUP_ORDER = [
    "Rh-hr",
    "KELL",
    "DUFFY",
    "KIDD",
    "LEWIS",
    "MNS",
    "P",
    "LUTHERAN",
    "SEX",
    "Additonal Antigens",
  ];


    export const DEFAULT_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "V", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    LEWIS: ["Lea", "Leb"],
    MNS: ["M", "N", "S", "s"],
    P: ["P1"],
    LUTHERAN: ["Lua", "Lub"],
    SEX: ["Xga"],
    COLTON: ["Coa", "Cob"],
    DIEGO: ["Dia", "Dib"],
    "Additonal Antigens": ["Wr"],
  };

  export const GROUP_MEMBERS: Record<string, Set<string>> = {
    "Rh-hr": new Set(["D", "C", "E", "c", "e", "f", "Cw", "V"]),
    KELL: new Set(["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"]),
    DUFFY: new Set(["Fya", "Fyb"]),
    KIDD: new Set(["Jka", "Jkb"]),
    "SEX": new Set(["Xga"]),
    LEWIS: new Set(["Lea", "Leb"]),
    MNS: new Set(["S", "s", "M", "N"]),
    P: new Set(["P1"]),
    LUTHERAN: new Set(["Lua", "Lub"]),
    "Additonal Antigens": new Set(["Wr"]),
    COLTON: new Set(["Coa", "Cob"]),
    DIEGO: new Set(["Dia", "Dib"]),
  };

  export const ORTHO_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "Cw", "V"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    "SEX": ["Xga"],
    LEWIS: ["Lea", "Leb"],
    MNS: ["S", "s", "M", "N"],
    P: ["P1"],
    LUTHERAN: ["Lua", "Lub"],
    "Additonal Antigens": [""],
  };

  export const ALBA_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "V", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    LEWIS: ["Lea", "Leb"],
    MNS: ["M", "N", "S", "s"],
    P: ["P1"],
    LUTHERAN: ["Lua", "Lub"],
    "SEX": ["Xga"],
    "Additonal Antigens": ["Wr"],
  };

  export const QUOTIENT_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "V", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    LEWIS: ["Lea", "Leb"],
    MNS: ["M", "N", "S", "s"],
    P: ["P1"],
    LUTHERAN: ["Lua", "Lub"],
    "SEX": ["Xga"],
    "Additonal Antigens": ["Wra"],
  };

  export const MEDION_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "Cw", "V"],
    MNS: ["M", "N", "S", "s"],
    P: ["P1"],
    LEWIS: ["Lea", "Leb"],
    LUTHERAN: ["Lua", "Lub"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    "SEX": ["Xga"],
    "Additonal Antigens": ["Wr"],
  };

  export const BIOTEST_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    LUTHERAN: ["Lua", "Lub"],
    KIDD: ["Jka", "Jkb"],
    MNS: ["M", "N", "S", "s"],
    LEWIS: ["Lea", "Leb"],
    P: ["P1"],
    "SEX": ["Xga"],
    "COLTON": ["Coa", "Cob"],
    "DIEGO": ["Dia", "Dib"],
  };

  export const BIORAD_GRIFOLS_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "E", "c", "e", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    LEWIS: ["Lea", "Leb"],
    P: ["P1"],
    MNS: ["M", "N", "S", "s"],
    LUTHERAN: ["Lua", "Lub"],
    "DIEGO": ["Dia"],
  };

  export const IMMUCOR_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": ["D", "C", "c", "E", "e", "V", "Cw"],
    KELL: ["K", "k", "Kpa", "Kpb", "Jsa", "Jsb"],
    DUFFY: ["Fya", "Fyb"],
    KIDD: ["Jka", "Jkb"],
    LEWIS: ["Lea", "Leb"],
    P: ["P1"],
    MNS: ["M", "N", "S", "s"],
    LUTHERAN: ["Lua", "Lub"],
    "SEX": ["Xga"],
  };

  //   // 1. Define a type for your selection
  // type MemberSource = 'DEFAULT' | 'ALBA' | 'ORTHO' | 'BIOTEST' | 'IMMUCOR' | 'MEDION' | 'GRIFOLS' | 'QUOTIENT' | 'BIO-RAD';
  
  // 2. Map the names to the actual data structures
  export const DataSources: Record<typeof ANTIGEN_MANUFACTURERS[number], Record<string, string[]>> = {
    "Create New": DEFAULT_GROUP_MEMBERS,
    "ALBA": ALBA_GROUP_MEMBERS,
    "ORTHO": ORTHO_GROUP_MEMBERS,
    "BIOTEST": BIOTEST_GROUP_MEMBERS,
    "IMMUCOR": IMMUCOR_GROUP_MEMBERS,
    "MEDION": MEDION_GROUP_MEMBERS,
    "GRIFOLS": BIORAD_GRIFOLS_GROUP_MEMBERS,
    "QUOTIENT": QUOTIENT_GROUP_MEMBERS,
    "BIO-RAD": BIORAD_GRIFOLS_GROUP_MEMBERS
  };

  export const MANUFACTURER_GRPORDER_MAP: Record<typeof ANTIGEN_MANUFACTURERS[number], string[]> = {
    "Create New": DEFAULT_GROUP_ORDER, 
    ORTHO: ORTHO_GROUP_ORDER,
    ALBA: ALBA_GROUP_ORDER,
    BIOTEST: BIOTEST_GROUP_ORDER,
    IMMUCOR: IMMUCOR_GROUP_ORDER,
    MEDION: MEDION_GROUP_ORDER,
    GRIFOLS: BIORAD_GRIFOLS_GROUP_ORDER,
    QUOTIENT: QUOTIENT_GROUP_ORDER,
    "BIO-RAD": BIORAD_GRIFOLS_GROUP_ORDER,
  };

  export const loadAntSettings = async (): Promise<void> => {
      try {
          // Initialize the database first
          await DatabaseService.initDatabase();
  
          // Load primary rule out threshold
          const manuSetting = await DatabaseService.getSetting('manuchoice');
          if (manuSetting) {
              //  = manuSetting.value.toString;
          }
  
      } catch (error) {
          console.error('Failed to load rule settings:', error);
      }
  };
  