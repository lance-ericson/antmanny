import DatabaseService from '../services/DatabaseService';
import { useEffect, useState } from 'react';

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
    "Additonal Antigens",
    "COLTON", 
    "DIEGO", 
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
    "COLTON", 
    "DIEGO", 
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
    "COLTON", 
    "DIEGO", 
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
    "COLTON",
    "SEX",
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
    "COLTON", 
    "DIEGO", 
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

    export const DEFAULT_EMPTY_GROUP_MEMBERS: Record<string, string[]> = {
    "Rh-hr": [],
    KELL: [],
    DUFFY: [],
    KIDD: [],
    LEWIS: [],
    MNS: [],
    P: [],
    LUTHERAN: [],
    SEX: [],
    COLTON: [],
    DIEGO: [],
    "Additonal Antigens": [],
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
    "COLTON": [""],
    "DIEGO": [""],
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
    "COLTON": [""],
    "DIEGO": [""],
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
    "COLTON": [""],
    "DIEGO": [""],
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
    "COLTON": [""],
    "DIEGO": [""],
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
   "Additonal Antigens": [""], 
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
    "COLTON": [""],
    "SEX": [""],
    "Additonal Antigens": [""], 
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
    "COLTON": [""],
    "DIEGO": [""],
   "Additonal Antigens": [""], 
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

  const normalizeManufacturerName = (name: string) => name.trim();

  export const getAllManufacturers = async (): Promise<string[]> => {
  try {
    // 1. Hardcoded defaults (The baseline)
    const defaultKeys = Object.keys(DataSources); 

    // 2. Fetch from DB
    const savedResult = await DatabaseService.getSetting('manufacturerList');
    
    // FIX: Access .value because getSetting now returns an object {key, value}
    const savedListRaw = savedResult ? savedResult.value : "";
    const savedKeys = savedListRaw
      ? savedListRaw.split(';').map(normalizeManufacturerName).filter(name => !!name)
      : [];

    // 3. Merge and remove duplicates
    const combined = Array.from(new Set([...defaultKeys, ...savedKeys]));
    
    // Filter out any empty strings to keep the Picker clean
    return combined.filter(name => !!name);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return Object.keys(DataSources); // Fallback to defaults so the list isn't empty
  }
};

  // Loads specific mapping for a chosen manufacturer
  export const loadSettingsForManufacturer = async (target: string) => {
    const normalizedTarget = normalizeManufacturerName(target);

    const defaultManufacturers = Object.keys(DataSources);
    for (let manufacturer of defaultManufacturers) {

      // if (manufacturer === "Create New")
      // {
      //   manufacturer = "CreateNew";
      // }
      const key = `antigenMapping_${manufacturer}`;
      
      // Check if this specific manufacturer's settings exist in DB
      const existingData = await DatabaseService.getSetting(key);
      
      if (!existingData) {
        console.log(`[Seed] Initializing DB storage for ${manufacturer}`);
        // Save the hardcoded default to the DB for the first time
        // const initialMembers = DataSources[manufacturer] || DEFAULT_GROUP_MEMBERS;
        // const copyMembers: Record<string, string[]> = {};
        // for (const usekey in initialMembers) {
        //   copyMembers[usekey] = [...initialMembers[usekey]];
        // }        
        await DatabaseService.saveSetting(key, JSON.stringify(DataSources[manufacturer]));
        const groupOrderKey = `groupOrder_${manufacturer}`;
        await DatabaseService.saveSetting(groupOrderKey, MANUFACTURER_GRPORDER_MAP[manufacturer].join(';'));        
      }
    }

    const storageKey = `antigenMapping_${normalizedTarget}`;
    const savedDataRaw = await DatabaseService.getSetting(storageKey);

    if (savedDataRaw) {
      return JSON.parse(savedDataRaw.value);
    }
    // Fallback to hardcoded DataSources if no DB record exists
    return DataSources[normalizedTarget] || {};
  };

  export const loadGroupOrder = async (manuName: string) => {
    try {
      const normalizedManuName = normalizeManufacturerName(manuName);
      const storageKey = `groupOrder_${normalizedManuName}`;
      const savedOrderRaw = await DatabaseService.getSetting(storageKey);

      if (savedOrderRaw && savedOrderRaw.value) {
        // Split the saved string back into an array
        return savedOrderRaw.value.split(';');
      }

      if (Object.keys(DataSources).includes(normalizedManuName))
      {
      return (
        MANUFACTURER_GRPORDER_MAP[normalizedManuName] || {});
      }
      // FALLBACKS if no saved order exists in DB:
      // 1. Check hardcoded map
      // 2. Otherwise, use keys from the default members
      return (DEFAULT_GROUP_ORDER);
    } catch (error) {
      console.error("Error loading group order:", error);
      return DEFAULT_GROUP_ORDER;
    }
  };

  export const loadGroupMembers = async (manuName: string) => {
    try {
      const normalizedManuName = normalizeManufacturerName(manuName);
      const storageKey = `groupMembers_${normalizedManuName}`;
      const savedMembersRaw = await DatabaseService.getSetting(storageKey);

      if (savedMembersRaw && savedMembersRaw.value) {
        return JSON.parse(savedMembersRaw.value);
      }

      const initialMembers = DataSources[normalizedManuName] || DEFAULT_GROUP_MEMBERS;
      const copyMembers: Record<string, string[]> = {};
      for (const key in initialMembers) {
        copyMembers[key] = [...initialMembers[key]];
      }

      return copyMembers;
    } catch (error) {
      console.error("Error loading group members:", error);
      return DEFAULT_GROUP_MEMBERS;
    }
  };

  export const useLoadAntigenSettings = (manuchoice: string) => {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [selectedAnt, setSelected] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [groups, setGroups] = useState(DEFAULT_GROUP_ORDER);
  

  // 1. APP START: Initialize DB and Load Master List
  useEffect(() => {
    const startUp = async () => {
      try {
        await DatabaseService.initDatabase();
        setIsDbReady(true); // Mark DB as ready

        const list = await getAllManufacturers();
        // Fallback to defaults if list is empty
        setManufacturers(list.length > 0 ? list : Object.keys(DataSources));
      } catch (error) {
        console.error("DB Initialization failed:", error);
      }
    };
    startUp();
  }, []);

  // 2. MANUCHOICE CHANGE: Load specific settings
  useEffect(() => {
    // Prevent fetching if DB isn't initialized yet
    if (!isDbReady) return;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await loadSettingsForManufacturer(manuchoice);
        setSelected(settings || {});

      // 2. Load Group Order (The sequence of the groups)
      const orderedGroups = await loadGroupOrder(manuchoice);
      setGroups(orderedGroups); // This populates the FlatList and fixes the crash

      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [manuchoice, isDbReady]); // Now depends on both choice and DB readiness

  const refreshList = async () => {
    const list = await getAllManufacturers();
    setManufacturers(list);
  };

  return { manufacturers, setManufacturers, selectedAnt, setSelected, isLoading, refreshList, groups, setGroups };
};

