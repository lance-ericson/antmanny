
import * as ConstAntigens from '../services/AntigenData';

enum ParserTableErrorCode {
    PARSING_FAILED = 'PARSING_FAILED',
}

class ParserTableError extends Error {
    constructor(
        public code: ParserTableErrorCode,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ParserTableError';
    }
}

type ParsedPanel = {
  metadata: {
    manufacturer: string;
    lotNumber: string;
    expirationDate: string; // YYYY-MM-DD
    panelType: string;
    testName: string;
    shadedColumns: string[];
  };
  antigenGroups: Record<string, string[]>;
  cells: Array<{
    rowNumber: string;
    cellId: string;
    donorNumber: string;
    results: Record<string, string | null>;
    specialNotations: string[];
  }>;
};

  const ANTIGEN_MANUFACTURERS = [
    "ALBA",
    "ALBAcyte",
    "Ortho",
    "BioTest",
    "Immucor",
    "Medion",
    "Grifols",
    "Quotient",
    "Bio-Rad",
  ] as const;

  const VALID_ANTIGENS = [
    "0",
    "+",
    "NT",
    "+s",
    "+w"
  ] as const;

  export class PanelTableParser {

  private toIsoDate(yyyymmddWithDots: string): string {
    // 2025.09.08 -> 2025-09-08
    return yyyymmddWithDots.replace(/\./g, "-");
  }

  private normalizeAntigenToken(token: string): {name: string; headerMarker?: string} {
    // Preserve asterisk marker as "shaded" indicator (common on panel sheets)
    let headerMarker: string | undefined;
    let t = token.trim();
    if (!t) return {name: ""};

    if (t.startsWith("*")) {
      headerMarker = "*";
      t = t.slice(1);
    }

    // Normalize superscripts to plain letters: áµƒ/Âª -> a, áµ‡ -> b
    // Normalize incorrect blurred readings
    t = t
      .replace(/[áµƒÂª]/g, "a")
      .replace(/[áµ‡Â°]/g, "b")
      .replace(/\./g, "+")
      .replace(/fit/g, "NT")
      .replace(/C\\\"/g, "Cw")
      .replace(/F\./g, "E")
      .replace(/Pâ‚/g, "P1");

    // Common tokens in this panel output
    // XgÂª -> Xga, WrÂª -> Wr
    if (t === "Xga" || t === "Xg") t = "Xga";
    if (t === "Wr") t = "Wr";

    // Ensure consistent casing for known antigens
    // (K/k are case-sensitive, keep as-is)
    return {name: t, headerMarker};
  }

  private expandCompressedHeaderToken(token: string): string[] {
    // The Textract header sometimes compresses multiple antigens into one token
    // e.g., DCEcefVC => D C E c e f Cw V
    //       Kk       => K k
    //       MNSs     => M N S s
    const raw = token.trim();
    if (!raw) return [];

    if (raw === "DCEcefVC") return ["D", "C", "E", "c", "e", "f", "V", "Cw"];
    if (raw === "DCEcefCV") return ["D", "C", "E", "c", "e", "f", "Cw", "V"];
    if (raw === "DCEcef") return ["D", "C", "E", "c", "e", "f"];
    if ((raw.length === 6) && raw.match(/D/) && raw.match(/C/) && raw.match(/E/) && raw.match(/c/) && raw.match(/e/) && raw.match(/f/)) return raw.split("");   
    if (raw === "Kk") return ["K", "k"];
    if (raw === "Kx") return ["K", "x"];
    if ((raw.length === 4) && raw.match(/M/i) && raw.match(/N/i) && raw.match(/S/i) && raw.match(/s/i)) return raw.split("");
    //if ((raw.length === 4) && raw.match(/M/i) && raw.match(/N/i) && raw.match(/S/i) && raw.match(/s/i)) return ["M", "N", "S", "s"];
    
    // default: single antigen token
    return [raw];
  }

  private tokenizeSpaceDelimited(line: string): string[] {
    return line.trim().split(/\s+/).filter(Boolean);
  }

  private extractMetadata(allText: string): ParsedPanel["metadata"] {
    let lotMatch = allText.match(/Lot No:\s*([^\\n]+)/i);
    let expMatch = allText.match(/Expiry Date:\s*([0-9]{4}\.[0-9]{2}\.[0-9]{2})/i);
    const allTextLower = allText.toLowerCase(); // call the function
    let manu: string = "";

    for (const m of ANTIGEN_MANUFACTURERS) {
      // m is likely already a string; if not, convert properly
      if (allTextLower.includes(m.toLowerCase())) { // compare lowercase to lowercase
        manu = m;
        // optionally break if you only want the first match:
        break;
      }
    }

    if (lotMatch === null || (lotMatch.entries.length === 0))
    {
      lotMatch = allText.match(/VSS[a-zA-Z0-9]+/i);
    }

    if (expMatch === null || (expMatch.entries.length === 0))
    {
      expMatch = allText.match(/20*([0-9]{2}\.[0-9]{2}\.[0-9]{2})/i);

      if (expMatch === null || expMatch.entries.length === 0)
      {
        expMatch = allText.match(/20*([0-9]{2}\-[0-9]{2}\-[0-9]{2})/i);
      }
    }
    
    return {
      manufacturer: manu, // not present in provided Textract text
      lotNumber: lotMatch?.[1]?.trim() ?? "",
      expirationDate: expMatch?.[1] ? this.toIsoDate(expMatch[1]) : "",
      panelType: "", // not present in provided Textract text
      testName: "", // not present in provided Textract text
      shadedColumns: [],
    };
  }

  private buildAntigenGroupsFromOrder(antigenOrder: string[], antigramManu: string, grpMembers: Record<string, string[]>, grpOrder: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    let grpKnown = ConstAntigens.ALBA_GROUP_ORDER;
    let allmembersInGrp = ConstAntigens.ALBA_GROUP_MEMBERS;

  
    {
       grpKnown = grpOrder;
       allmembersInGrp = grpMembers;
    }

    for (const g of grpKnown) {    
      const members = allmembersInGrp[g];
      const present = antigenOrder.filter(a => members?.includes(a));
      if (present.length) groups[g] = present;
    }

    // Any remaining antigens not covered (if the panel adds more columns)
    const known = new Set(Object.values(groups).flat());
    const extras = antigenOrder.filter(a => !known.has(a));
    if (extras.length) groups["Other"] = extras;

    return groups;
  }

  private buildKnownAntigenGroupsFromOrder(antigramManu: string, grpMembers: Record<string, string[]>, grpOrder: string[]): string[] {
    const groups: Record<string, string[]> = {};
    const antigensBasedonGrp : string[] = [];
    let grpKnown = ConstAntigens.ALBA_GROUP_ORDER;
    let allmembersInGrp = ConstAntigens.ALBA_GROUP_MEMBERS;

    {
      grpKnown = grpOrder;
      allmembersInGrp = grpMembers;
    }
    for (const g of grpKnown) {
      const members = allmembersInGrp[g];
      for(const m of members) {
        if (m != "")
          antigensBasedonGrp.push(m);
      }
    }

    return antigensBasedonGrp;
  }

  private parsePanelFromTextractText(allText: string, manutouse : string, grpMembers: Record<string, string[]>, grpOrder: string[]): ParsedPanel {
    let cleanedText = allText.replace(/(\r\n|\n|\r|\\n)/g, "");
    const metadata = this.extractMetadata(cleanedText);

    // Work line-by-line
    const lines = allText.split("\\n").map(l => l.trim()).filter(Boolean);

    // Find the first header row that starts with "Cell #" and includes "Donor"
    let headerIdx = lines.findIndex(l => /^Cell\s*#/.test(l));
    let antigenscntfrmGrp = 0;
    let grpheaderIdx = headerIdx;

    //if (headerIdx < 0) {
      // Try other group
      headerIdx = lines.findIndex(l => /\bKell\b/i.test(l));
      if (headerIdx < 0) {
      headerIdx = lines.findIndex(l => /\bDuffy\b/i.test(l));

      if (headerIdx < 0) {
        headerIdx = lines.findIndex(l => /\bKidd\b/i.test(l));

        if (headerIdx < 0) {
          headerIdx = lines.findIndex(l => /\bLewis\b/i.test(l));
        }
      }
      }

      if (headerIdx < 0) {
        return {
          metadata,
          antigenGroups: this.buildAntigenGroupsFromOrder([], manutouse, grpMembers, grpOrder),//metadata.manufacturer),
          cells: [],
        };
      }
      else
      {
         headerIdx++;
      }
    //}

    const grpsLine = lines[headerIdx-1];
    let fRhhrSupported  = false;
    let fKellSupported  = false;
    let fDuffySupported  = false;
    let fMNSSupported  = false;
    let fKIDDSupported  = false;
    let fLewisSupported  = false;
    let fP1Supported  = false;
    let fLuthSupported  = false;
    let fXgaSupported  = false;
    let fOthersSupported  = false;
    let antigenOrderBasedonGrp : string[] = [];
    const antigenGrpsInOrder : string[] = [];


    if (/\bRh-hr\b/i.test(grpsLine))
    { // 7 or 6
      antigenscntfrmGrp += 5;
      fRhhrSupported = true;
    }
   
    if (/\bKell\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 6;
      fKellSupported = true;
    }

    if (/\bDuffy\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 2;
      fDuffySupported = true;
    }

    if (/\bMNS\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 4;
      fMNSSupported = true;
    }

    if (/\bKidd\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 2;
      fKIDDSupported = true;
    }

    if (/\bLewis\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 2;
      fLewisSupported = true;
    }

    if (/\bP\b/i.test(grpsLine))
    {
      antigenscntfrmGrp += 1;
      fP1Supported = true;
    }

    if (/\bLuth/i.test(grpsLine))
    {
      antigenscntfrmGrp += 2;
      fLuthSupported = true;
    }

    let headerpluscnt = 0;
    let firstcellnum = 0;

    let headerIdxTest = headerIdx + 1;
    let firstantigenpos = 3;
    let foundfirst = 0;
    let headerLine2 = lines[headerIdx];
    //const headerTokens2 = this.tokenizeSpaceDelimited(headerLine2);

    lines[headerIdx] = lines[headerIdx].replace(/C\\\"/g, "Cw");
    grpheaderIdx = headerIdx - 1;
    let grpTokens = this.tokenizeSpaceDelimited(lines[headerIdx].toString());
    let grpTokensCpy = [];
  
    for (const tok of grpTokens) {
      grpTokensCpy.push(this.expandCompressedHeaderToken(tok));
    }

    const grpheaderTokens = this.tokenizeSpaceDelimited(lines[grpheaderIdx]);
    let rhHrDone = false;
    
    // throw new ParserTableError(
    // ParserTableErrorCode.PARSING_FAILED,
    // 'HeaderIdx is ' + headerIdx +" " + lines[headerIdx].toString() +" " + metadata.manufacturer,  );

    if (metadata.manufacturer.toLowerCase().includes("alba") 
         || metadata.manufacturer.toLowerCase().includes("ortho"))
    {
      if (metadata.manufacturer.toLowerCase().includes("alba"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("alba", grpMembers, grpOrder);
        antigenscntfrmGrp = 29;
      }
      else if (metadata.manufacturer.toLowerCase().includes("ortho"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("ortho", grpMembers, grpOrder);
        antigenscntfrmGrp = 28;
      }
      else if (metadata.manufacturer.toLowerCase().includes("biotest"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("biotest", grpMembers, grpOrder);
        antigenscntfrmGrp = 30;
      }      
      else if (metadata.manufacturer.toLowerCase().includes("immucor"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("immucor", grpMembers, grpOrder);
        antigenscntfrmGrp = 27;
      }
      else if (metadata.manufacturer.toLowerCase().includes("medion"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("medion", grpMembers, grpOrder);
        antigenscntfrmGrp = 27;
      }      
      else if (metadata.manufacturer.toLowerCase().includes("biorad"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("biorad", grpMembers, grpOrder);
        antigenscntfrmGrp = 26;
      }      
      else if (metadata.manufacturer.toLowerCase().includes("quotient"))
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("quotient", grpMembers, grpOrder);
        antigenscntfrmGrp = 29;
      }       
      else
      {
        antigenOrderBasedonGrp = this.buildKnownAntigenGroupsFromOrder("alba", grpMembers, grpOrder);
        antigenscntfrmGrp = 29;
      }
    }
    else
    {
    //       throw new ParserTableError(
    // ParserTableErrorCode.PARSING_FAILED,
    // 'HeaderIdx is ' + headerIdx +" NONE detected " + metadata.manufacturer.toLowerCase(),  );  
      // based on Textract output
    for (const tokgrp of grpheaderTokens)
    {
      //antigenGrpsInOrder.push(tokgrp);

      switch(tokgrp.toLowerCase()) {
        case "rh-hr":

          if (!rhHrDone) {
            rhHrDone = true;
            // this is the most likely first order
            antigenOrderBasedonGrp.push("D", "C", "E", "c", "e");

            if (((grpTokensCpy.join(" ").indexOf(" f ")) > 0)
                || ((grpTokensCpy.join("").toLowerCase().indexOf("c1c")) > 0)
                || ((grpTokensCpy.join("").toLowerCase().indexOf("e1c")) > 0) // f is seen as 1
                || ((grpTokensCpy.join("").toLowerCase().indexOf("c1v")) > 0))
            {
              antigenscntfrmGrp += 1;
              antigenOrderBasedonGrp.push("f");
            }

            if (grpTokensCpy.join("").toLowerCase().indexOf("vc") > 0)
            {
              antigenscntfrmGrp += 2;
              antigenOrderBasedonGrp.push("V");
              antigenOrderBasedonGrp.push("Cw");
            }
            else if ((grpTokensCpy.join("").toLowerCase().indexOf("cv") > 0) || (grpTokensCpy.join("").toLowerCase().indexOf("cwv") > 0))
            {
              antigenscntfrmGrp += 2;
              antigenOrderBasedonGrp.push("Cw");
              antigenOrderBasedonGrp.push("V");
            }
            else 
            { // one by one
              if (grpTokensCpy.join(" ").toLowerCase().indexOf(" v ") > 0)
              {
                antigenscntfrmGrp += 1;
                antigenOrderBasedonGrp.push("V");
              }

              if ((grpTokensCpy.join(" ").toLowerCase().indexOf(" cw ") > 0) || (grpTokensCpy.join("").toLowerCase().indexOf("ec") > 0))
              {
                antigenscntfrmGrp += 1;
                antigenOrderBasedonGrp.push("Cw");
              }
            }

          }

          break;

        case "kell":
          antigenOrderBasedonGrp.push("K", "k", "Kpa", "Kpb", "Jsa", "Jsb");
          break;

        case "duffy":
          antigenOrderBasedonGrp.push("Fya", "Fyb");
          break;
      
        case "mns":
          if ((grpTokensCpy.join("").toLowerCase().indexOf("ssmn")) > 0)
          {
            antigenOrderBasedonGrp.push("S", "s", "M", "N");
          }
          else
          {
            antigenOrderBasedonGrp.push("M", "N", "S", "s");
          }
          break;

        case "kidd":
          antigenOrderBasedonGrp.push("Jka", "Jkb");
          break;

        case "lewis":
          antigenOrderBasedonGrp.push("Lea", "Leb");
          break;
        
        case "luth":
        case "luth.":
        case "lutheran":          
          if (!antigenOrderBasedonGrp.includes("Lua"))
          {
            antigenOrderBasedonGrp.push("Lua", "Lub");
          }
          break;      

        case "additional":
        case "sex":
        case "xga":
        case "xg":
        case "special":
          if (grpTokensCpy.findIndex(l => /\bXg/i.test(l)) && !antigenOrderBasedonGrp.includes("Xga"))
          {
            antigenscntfrmGrp += 1;
            fXgaSupported = true;
            antigenOrderBasedonGrp.push("Xga");
          }

          if (grpTokensCpy.findIndex(l => /\bWr/i.test(l)) && !antigenOrderBasedonGrp.includes("Wr"))
          {
            antigenscntfrmGrp += 1;
            fOthersSupported = true;
            antigenOrderBasedonGrp.push("Wr");
          }

          break;

        case "p":
          antigenOrderBasedonGrp.push("P1");
          break;
        case "colton":          
          if (!antigenOrderBasedonGrp.includes("Coa"))
          {
            antigenOrderBasedonGrp.push("Coa", "Cob");
          }
          break;      
        case "diego":          
          if (!antigenOrderBasedonGrp.includes("Dia"))
          {
            antigenOrderBasedonGrp.push("Dia", "Dib");
          }
          break;      
        default: // unknown, just ignore
      }
    } // end switch
    } // end for loop


    // Create excluded antigens list:
    const allAntigenses = ['D', 'C', 'E', 'c', 'e', 'f', 'Cw', 'V', 
      'K', 'k', 'Kpa', 'Kpb', 'Jsa', 'Jsb',
      'Fya', 'Fyb',
      'Jka', 'Jkb',
      'Xga',
      'Lea', 'Leb',
      'S', 's', 'M', 'N',
      'P1',
      'Lua', 'Lub',
      'Coa', 'Cob',
      'Dia', 'Dib',
      'Wr'
    ];
    const excludedAntigens = allAntigenses.filter(element => !antigenOrderBasedonGrp.includes(element));

    // Replace some common mistake in header tokens
    lines[headerIdx] = headerLine2.replace("Js Js", "Jsa Jsb");
    lines[headerIdx] = headerLine2.replace("Fy Fy", "Fya Fyb");
    lines[headerIdx] = headerLine2.replace("K x", "K k");
    lines[headerIdx] = headerLine2.replace("Kp K", "Kpa K"); 
    lines[headerIdx] = headerLine2.replace("Le\' Le\'", "Lea Leb"); 
    lines[headerIdx] = headerLine2.replace("Jk JK\? ", "Jka Jkb"); 
    lines[headerIdx] = headerLine2.replace("N S S", "N S s"); 


      // Test that the next line has the antigens
    while (true) {
      const grpLine = lines[headerIdxTest];
      grpTokens = this.tokenizeSpaceDelimited(grpLine);
      firstcellnum = parseInt(grpTokens[0]);

      // Test that the first column is the cell # and it is also the last
      if (/^\d+$/.test(grpTokens[0]))// && (grpTokens.indexOf(grpTokens[0]) !== grpTokens.lastIndexOf(grpTokens[0])))
      {
        // Test that there are +++ and 000s on this line
        let total = 0;

        firstantigenpos = 0;
        for (const word of grpTokens) {
            const validantigen =
            word === "+" ||
            word === "0" ||
            word === "/" ||
            word === "NT" ||
            word === "nt" ||
            word === "+s" ||
            word === "+w" ||
            word === "." || // In blurred images a "+"" can look like a ".""
            word === "+W";
          if (validantigen) {
            total++;
            foundfirst = 1;
          } else {
            if (foundfirst === 0) {
              firstantigenpos++;
            }
          }
        }

        // at least should be > half of tokens
        if ((total > 8) && (total > grpTokens.length/2)) {
          headerIdx = headerIdxTest - 1;
          break;
        }
      }
      else {
        headerIdxTest++; // try the next one
        headerpluscnt++;
      }

      if (headerpluscnt > 4) {
        break;
      }
    }

    if (headerpluscnt > 4) {
      return {
        metadata,
        antigenGroups: this.buildAntigenGroupsFromOrder([], /*metadata.manufacturer*/manutouse, grpMembers, grpOrder),
        cells: [],
      }
    }

    let headerLine = lines[headerIdx];
    const headerTokens = this.tokenizeSpaceDelimited(headerLine);

    // Replace some common mistake in header tokens
    headerLine = headerLine.replace("Js Js", "Jsa Jsb");
    headerLine = headerLine.replace("Fy Fy", "Fya Fyb");
    headerLine = headerLine.replace("K x", "K k");
    headerLine = headerLine.replace("Kp K", "Kpa K"); 
    headerLine = headerLine.replace("Le' Le'", "Lea Leb"); 
    headerLine = headerLine.replace("Jk JK? ", "Jka Jkb"); 
    

    // Dynamic antigens list starts after the word "Donor"
    let donorPos = headerTokens.findIndex(t => t.toLowerCase() === "donor");
    
    if (donorPos < 0)
    { // Try French Donneur
          donorPos = firstantigenpos - 1;
    //   donorPos = headerTokens.findIndex(t => t.toLowerCase() === "donneur");
    }

    const hasDonorNumber = headerLine.toLowerCase().includes("donor number");//headerTokens.some(t => t.toLowerCase() === "donor number");
    if (hasDonorNumber)
    {
      donorPos = headerTokens.findIndex(t => t.toLowerCase() === "number");
    }

    if (donorPos < 0) {
      return {
        metadata,
        antigenGroups: this.buildAntigenGroupsFromOrder([], /*metadata.manufacturer*/manutouse, grpMembers, grpOrder),
        cells: [],
      };
    }

    // Stop antigens at "Special" (ignore Special Types / Test Results / etc.)
    // Not relieable
    let specialPos = headerTokens.findIndex(t => /^Special$/i.test(t));

    if (specialPos < 0)
    {
      // Look for French Spez
      specialPos = headerTokens.findIndex(t => /^Spez$/i.test(t));
      if (specialPos < 0)
      {
        // Check for repeated "Cell#"
        if ((headerTokens[0] === headerTokens[headerTokens.length - 1]) && headerTokens[0].match(/^Cell\s*#/i))
        {
          specialPos = headerTokens.length - 1;
        }
      }
    }

    const antigenHeaderTokens = headerTokens.slice(
      donorPos + 1,
      specialPos > -1 ? specialPos : headerTokens.length // specialPos is not reliable
    );

    // Compare with predefined headers

    // Expand compressed tokens and normalize
    const shadedColumns = new Set<string>();
    let antigenOrder: string[] = [];
    let ctrgen = 0
    for (const tok of antigenHeaderTokens) {

      for (const expanded of this.expandCompressedHeaderToken(tok)) {
        const {name, headerMarker} = this.normalizeAntigenToken(expanded);
        if (!name) continue;
        if (headerMarker) shadedColumns.add(name);
        // Also treat originally-starred tokens like "*Jsa" / "*Jsb"
        if (tok.startsWith("*")) shadedColumns.add(name);
        //antigenOrder.push(name);

        ctrgen++;

        if (ctrgen === antigenscntfrmGrp)
        {
          break;
        }
      }

      if (ctrgen === antigenscntfrmGrp)
      {
        break;
      }
    }
    metadata.shadedColumns = Array.from(shadedColumns);

    const expectedAntigenCount = antigenscntfrmGrp;//antigenOrder.length;

    // Parse rows until ENDOFTABLEDATA (or until a non-row section begins)
    const endIdx = lines.findIndex(l => /ENDOFTABLEDATA/i.test(l));
    const dataStart = headerIdx + 1;
    const dataEnd = endIdx > -1 ? endIdx : lines.length;

    const rawRows = lines.slice(dataStart, dataEnd);

    const cells: ParsedPanel["cells"] = [];
    antigenOrder = [...antigenOrderBasedonGrp]; // replace with this based on Grps
    let rowCnt = 0;

    for (const rowLine of rawRows) {
      rowCnt++;
      // Skip non-data lines
      // Expect rows like: "1 Râ‚WRâ‚ 6110302318014 + + 0 ... 0 1"
      const tokens = this.tokenizeSpaceDelimited(rowLine);
      if (tokens.length < 4) continue;
      if (!/^\d+$/.test(tokens[0])) continue; // must start with row number

      const rowNumber = tokens[0];

      // Drop trailing repeated row number if present
      let end = tokens.length;
      if (tokens[end - 1] === rowNumber) end -= 1;

      const trimmed = tokens.slice(0, end);
      if (trimmed.length < 4) continue;

      let cellId = trimmed[1];
      let donorNumber = trimmed[2];
      let rawValues = trimmed.slice(firstantigenpos);

      if (firstantigenpos > 3) {
        donorNumber = trimmed[firstantigenpos - 1];
        cellId = trimmed[firstantigenpos - 2];
      } 

      // Condition: if header antigen count > value count => last antigen(s) empty
      // If value count > antigen count => extra column(s) exist (e.g., Special Types); ignore extras
      const antigenValues = rawValues.slice(0, expectedAntigenCount);
      const ignoredExtras = rawValues.slice(expectedAntigenCount);

      const results: Record<string, string | null> = {};
      const specialNotations: string[] = [];

      // Validation: donor number 6 digits
      if (!/^\d{6}$/.test(donorNumber)) {
        specialNotations.push("donorNumberNot6Digits");
      }

      // Map values left-to-right without drifting

      // If the antigen values count is less than expected antigens, mark the row so user can enter manually


      if (antigenValues.length < antigenOrder.length) 
      {
        // issue warning
        for (let i = 0; i < antigenOrder.length; i++) {
          const antigen = antigenOrder[i];
          specialNotations.push(`marker:*:${antigen}`);
        }
      }
      else 
      {
        for (let i = 0; i < antigenOrder.length; i++) {
          const antigen = antigenOrder[i];
          let v = antigenValues[i] ?? null;

          if (v === ".")
          { // + read as .
            results[antigen] = "+";
          }
          else if (v === "fit")
          {
            results[antigen] = "NT";
          }
          else
          {
            results[antigen] = v;
          }

          // Validation: allowed values (+,0,/, +s,+w, null, NT) and note markers like "*", "W"
          if (v !== null) {
            const base = v.replace(/^\*/, ""); // allow *+/*0
            const ok =
              base === "+" ||
              base === "0" ||
              base === "/" ||
              base === "NT" ||
              base === "+s" ||
              base === "+w" ||
              base === "+W";
            if (!ok) specialNotations.push(`invalidResultValue:${antigen}=${v}`);
            if (v.startsWith("*")) specialNotations.push(`marker:*:${antigen}`);
            if (v.includes("W")) specialNotations.push(`marker:W:${antigen}`);
          }
        }
      }


      // Add excluded entries
      for (let i = 0; i < excludedAntigens.length; i++) {
        const antigen = excludedAntigens[i];
        results[antigen] = "NT";
      }

      if (ignoredExtras.length) {
        // e.g., Special Types column value(s) that were excluded by rule
        specialNotations.push(`ignoredTrailingColumns=${ignoredExtras.join(",")}`);
      }

      cells.push({rowNumber, cellId, donorNumber, results, specialNotations});
    }

    // Remove antigens that are entirely empty across all cells (rule #12)
    const allAntigens = [...antigenOrder];
    allAntigens.concat(excludedAntigens);
    const nonEmptyAntigens = allAntigens.filter(a =>
      cells.some(c => c.results[a] !== null && c.results[a] !== "")
    );

    // Rebuild results with only non-empty antigens
    const prunedCells = cells.map(c => {
      const newResults: Record<string, string | null> = {};
      for (const a of nonEmptyAntigens) newResults[a] = c.results[a] ?? null;
      return {...c, results: newResults};
    });

    const antigenGroups = this.buildAntigenGroupsFromOrder(nonEmptyAntigens, /*metadata.manufacturer*/manutouse, grpMembers, grpOrder);

    return {metadata, antigenGroups, cells: prunedCells};
  }


  public parsePanelTable(jsonData: string, isFirstPanel: boolean, manutouse : string, grpMembers: Record<string, string[]>, grpOrder: string[]) {
    // const text =
    //   typeof jsonData === "string"
    //     ? jsonData
    //     : (jsonData as any)?.data ?? "";

    const parsed = this.parsePanelFromTextractText(jsonData, manutouse, grpMembers, grpOrder);

    // return parsed object (recommended)
    //return parsed;

    // OR if you really want a string:
    return JSON.stringify(parsed);//, null, 2);
  }  
}

export default PanelTableParser;