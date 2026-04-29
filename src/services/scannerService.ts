import {
  Alert,
  Image,
  ScrollView, 
  Text
} from 'react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';
import OpenAI from 'openai';
import RNFS from 'react-native-fs';
import {
    ResultValue,
    ScanResult,
    PanelData,
    DualScanResult,
} from '../types';
import { REACT_APP_API_KEY as apiKey, UPLOAD_PRESET, CLOUD_NAME } from "@env";
import axios from 'axios';
import ImageResizer from 'react-native-image-resizer';
import React, {useMemo} from "react";
import { PanelTableParser } from '../services/PanelTableParser';

enum ScannerErrorCode {
    CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
}

class ScannerError extends Error {
    constructor(
        public code: ScannerErrorCode,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ScannerError';
    }
}

const BASE_URL = 'https://api.openai.com/v1';
 // Create reference to scanner service
//const PanelTableParserservice = React.useRef(new PanelTableParser()).current;
const parserTableservice = new PanelTableParser();

export class ScannerService {
    private isInitialized = false;
   private readonly maxFileSize = 50 * 1024 * 1024; // 10MB

    constructor() {

    }

    private handleError(error: unknown, context: string = ''): never {
        if (error instanceof ScannerError) {
            throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ScannerService] ${context}:`, message);

        throw new ScannerError(
            ScannerErrorCode.IMAGE_PROCESSING_FAILED,
            `${context}: ${message}`,
            error instanceof Error ? error : undefined
        );
    }

    private uploadImage = async (base64Image: string): Promise<string> => {
        try {
            // const response = await axios.post('https://api.imgbb.com/1/upload', null, {
            //     params: {
            //         key: IMGBB_API_KEY,
            //         image: base64Image,
            //     },
            // });
            // console.log('Image uploaded:', response.data.data.url);
            // return response.data.data.url;
            const formData = new FormData();
            formData.append('file', `data:image/jpeg;base64,${base64Image}`);
            formData.append('upload_preset', UPLOAD_PRESET);
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            const json = await response.json();
            console.log(json);

            console.log('Image uploaded:', json.secure_url);
            return json.secure_url;
        } catch (error) {
            this.handleError(error, 'Image upload failed');
        }
    };

    public async processFiles(files: { first: string; second: string }): Promise<DualScanResult> {
        try {
            console.log('Processing dual panel files');

            // Validate files
            await Promise.all([
                this.validateFile(files.first),
                this.validateFile(files.second)
            ]);

            // Process both files in parallel
            const [firstResult, secondResult] = await Promise.all([
                this.processFile(files.first, true),
                this.processFile(files.second, false)
            ]);

            // Validate panel types match expected types
            // if (!this.validatePanelTypes(firstResult.results, secondResult.results)) {
            //     throw new ScannerError(
            //         ScannerErrorCode.DUAL_PANEL_MISMATCH,
            //         'Panel types do not match expected configuration'
            //     );
            // }

            return {
                first: firstResult,
                second: secondResult,
            };

        } catch (error) {
            console.error('Error in processFiles:', error);
            throw new ScannerError(
                ScannerErrorCode.FILE_PROCESSING_FAILED,
                'Failed to process panel files',
                error instanceof Error ? error : undefined
            );
        }
    }

    private async validateFile(fileUri: string): Promise<void> {
        const fileInfo = await RNFS.stat(fileUri);
        if (fileInfo.size > this.maxFileSize) {
            throw new ScannerError(
                ScannerErrorCode.INVALID_IMAGE,
                'File size too large'
            );
        }
    }

    private validatePanelTypes(firstPanel: PanelData, secondPanel: PanelData): boolean {
        // First panel should be Screen type, second should be A, B, or C
        return (
            firstPanel.metadata.panelType === 'Surgiscreen' &&
            ['A', 'B', 'C'].includes(secondPanel.metadata.panelType)
        );
    }

    public async processFile(fileUri: string, isFirstPanel: boolean): Promise<ScanResult> {
        let resizedImageUri = null;
        try {
            console.log(`Processing ${isFirstPanel ? 'first' : 'second'} panel:`, fileUri);

            const resizedImage = await ImageResizer.createResizedImage(
                fileUri, // Path to the original image
                800, // New width
                800, // New height
                'JPEG', // Format
                80 // Quality
            );

            resizedImageUri = resizedImage.uri; // Save URI for later cleanup
            console.log('Image resized successfully:', resizedImageUri);
            // Convert to base64
            const base64 = await RNFS.readFile(resizedImageUri, 'base64');
            console.log('File read successfully');

            // Upload image
            const url = await this.uploadImage(base64);

            // Process panel data with AI
            const panelData = await this.analyzeImageWithAI(url, isFirstPanel);
            console.log('AI analysis completed');

            // Calculate confidence
            const confidence = this.calculateConfidence(panelData);

            return {
                original: fileUri,
                processed: fileUri,
                results: panelData,
                confidence,
            };
        } catch (error) {
            console.error(`Error processing ${isFirstPanel ? 'first' : 'second'} panel:`, error);
            throw new ScannerError(
                ScannerErrorCode.FILE_PROCESSING_FAILED,
                `Failed to process ${isFirstPanel ? 'first' : 'second'} panel`,
                error instanceof Error ? error : undefined
            );
        } finally {
            // Step 5: Clean up temporary resized image
            if (resizedImageUri) {
                try {
                    await RNFS.unlink(resizedImageUri); // Delete the temporary file
                    console.log('Temporary resized image deleted:', resizedImageUri);
                } catch (cleanupError) {
                    console.error('Error deleting temporary resized image:', cleanupError);
                }
            }
        }
    }

       public async processFile2(jsonData: string, isFirstPanel: boolean, manutouse : string, grpMembers: Record<string, string[]>, grpOrder: string[]): Promise<ScanResult> {
        let resizedImageUri = null;
        try {
            //console.log(`Processing ${isFirstPanel ? 'first' : 'second'} panel:`, jsonData);

            // Process panel data with AI
            //const panelData = await this.analyzeImageURLWithAI(jsonData, isFirstPanel);
            
            const panelData = await this.analyzeImageWithAI(jsonData, isFirstPanel, manutouse, grpMembers, grpOrder);
            
            console.log('AI analysis completed');

            // Calculate confidence
            //const confidence = this.calculateConfidence(panelData);
            const confidence = 99;


            return {
                original: jsonData,
                processed: jsonData,
                results: panelData,
                confidence,
            };
        } catch (error) {
            console.error(`Error processing ${isFirstPanel ? 'first' : 'second'} panel:`, error);
            throw new ScannerError(
                ScannerErrorCode.FILE_PROCESSING_FAILED,
                `Failed to process ${isFirstPanel ? 'first' : 'second'} panel` + ' error '+ error.message,
                error instanceof Error ? error : undefined
            );
        } finally {
            // Step 5: Clean up temporary resized image
            if (resizedImageUri) {
                try {
                    await RNFS.unlink(resizedImageUri); // Delete the temporary file
                    console.log('Temporary resized image deleted:', resizedImageUri);
                } catch (cleanupError) {
                    console.error('Error deleting temporary resized image:', cleanupError);
                }
            }
        }
    }



    private async analyzeImageWithAI(url: string, isFirstPanel: boolean, manutouse : string, grpMembers: Record<string, string[]>, grpOrder: string[]): Promise<PanelData> {
        try {
            console.log('Starting AI analysis');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`};

            const requestBody = {
                model: 'gpt-5.2',
                reasoning_effort: 'medium',              
                messages: [
                    {
                        role: 'user', content: `You are a helpful assistant. Refer to the json-formatted AWS Textract output given below:\n${url}`
                    

                    },
                    {
                        role: 'user',
                        content: `Given the above AWS Textract output, there is a table before the word "ENDOFTABLEDATA" . Start processing the table on the row with text "Cell #". It is in csv-like format with ' ' space as column delimeter for antigen values and newline "\n" as a row separator. Please analyze this blood-typing antibody panel, and extract ALL data with high precision from this table . Follow this structured format in the response:  

1. PANEL IDENTIFICATION:
- Manufacturer: [e.g., Ortho Clinical Diagnostics]
- Lot Number: [exact format as shown]
- Expiration Date: [YYYY-MM-DD]
- Full Test Name: [complete test name including ® symbols]
- Panel Type: [e.g., Panel A, Panel B, Panel C, Surgiscreen]

2. ANTIGEN GROUPS (If possible, follow the order in the table from the Textract output and it could be shuffled):
Group the antigens into these. Cell data is found before the word ENDOFTABLEDATA:
- Rh-hr (D,C,E,c,e,f,Cw,V)
- KELL (K,k,Kpa,Kpb,Jsa,Jsb)
- DUFFY (Fya,Fyb)
- KIDD (Jka,Jkb)
- LEWIS (Lea,Leb)
- MNS (S, s, M, N)
- P (P1)
- LUTHERAN (Lua, Lub)
- Sex Linked (Xga)
- Additonal Antigens (Wr)

3. DETAILED CELL DATA. Cell data is found in before ENDOFTABLEDATA:
For each row (1 to N rows), extract:
- Row Number in image Cell#
- Cell ID (name of cell row exactly as written such as "Rh-hr")
- Donor Number (6 digits)
- Results for EACH antigen (maintaining exact order)
- Special notations (HLA+, @, etc.)

4. VALIDATION RULES:
- Verify all donor numbers are 6 digits
- Valid result values: "+", "0", "/", "+s", "+w", "NT", "*0", "*+", null
- Note any special markers (HLA+, @)
- Preserve shaded column indicators
- The number of antigens correspond to the number of columns to map the antigens to

Please format as JSON:
{
  "metadata": {
    "manufacturer": "",
    "lotNumber": "",
    "expirationDate": "",
    "panelType": "",
    "testName": "",
    "shadedColumns": []
  },
  "antigenGroups": {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "Cw", "V"],
    "KELL": ["K", "k", "Kpᵃ", "Kpᵇ", "Jsa","Jsb"], 
    "DUFFY": ["Fya", "Fyb"],
    "KIDD": ["Jka", "Jkb"],
    "LEWIS": ["Lea", "Leb"],
    "MNS": ["S", "s", "M", "N"],
    "P": ["P1"],
    "LUTHERAN": ["Lua", "Lub"],
    "Sex Linked": ["Xga"],
    "Additonal Antigens": ["Wr"],
    // continue other columns if it exists
  },
  "cells": [
    {
      "rowNumber": "",
      "cellId": "",
      "donorNumber": "",
      "results": {
        // All antigens following the order in the table
        "D": "",
        "C": "",
        "c": "",
        "e": "",
        "f": "",
        // ... continue for all antigens and group them into the "antigenGroups" groups
      },
      "specialNotations": []
    }
  ]
}

Important:
1. Process the antigen data per row (newline '\n' as delimeter), map from left to right, and do not drift. 
2. The antigen value starts after the Donor column. So it starts on the 4th field value of the row.
3. The row number is repeated at the end of the row so be careful. The last number in the row is also the row number and not an antigen.
4. The first row is important so make sure it is accurate. You always make a mistake on the MNS group, so be careful with the "M", "N", "S", "s" antigens.
5. Put "Sex Linked" antigen "Xga" and "Wr" (Additional antigens) in the last group or column.
6. Kpᵃ can be written as Kpa, and vice versa. Kpᵇ can be written as Kpb, and vice versa. 
7. Note any shaded columns and include any footer notes as specialNotations.
8. Maintain exact spelling and formatting, if possible and preserve ALL special characters (®, ©) in labels
9. In KELL group, 'K' and 'k' are case-sensitive and are different antigens.
10. Antigens Fya and Fyb belong to DUFFY antigen group.
11. If you can't analyze the blood typing antibody panel image as I requested please return empty data with all structured format. and without sorry message
12. Don't include cell when whole column is empty. 
13. Process all antigens with high precision, even the last antigens. "NT" is a valid value, if you see it.
14. Ignore column or group "Special Antigen Typing" and column or group "Test Results".
15. Ortho Clinical Diagnostics is a name of a Manufacturer. ALBA is another manufacturer. Other manufactures may be found as a title or in the header.`,
                            },
                        ],
            };

//             console.log('Sending request to OpenAI');
//             const response = await axios.post(
//                 'https://api.openai.com/v1/chat/completions',
//                 requestBody,
//                 { headers }
//             );
// //'https://api.openai.com/v1/chat/completions',
//             if (!response.data.choices[0]?.message?.content) {
//                 throw new Error('No analysis results received from AI');
//             }

//             let jsonString = response.data.choices[0].message.content;
//             const cleanedString = jsonString.replace(/[`]/g, '').replace(/json/g, '');

//             const aiResponse = JSON.parse(cleanedString);

            const jsonString = parserTableservice.parsePanelTable(url, isFirstPanel, manutouse, grpMembers, grpOrder);
            const cleanedString = jsonString.replace(/[`]/g, '').replace(/json/gi, '');

            const aiResponse = JSON.parse(cleanedString);

            return validateAndFormatAIResponse(aiResponse);
        } catch (error) {
            console.error('Error in AI analysis:', error);
            throw new ScannerError(
                ScannerErrorCode.AI_ANALYSIS_FAILED,
                'Failed to analyze image with AI' + ' error '+ error.message,
                error instanceof Error ? error : undefined
            );
        }
    }


        private async analyzeImageURLWithAI(url: string, isFirstPanel: boolean): Promise<PanelData> {
        try {
            console.log('Starting AI analysis');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`};

            const urlwithbase64data = "data:image/jpg;base64," + url;
            const requestBody = {
                model: 'gpt-5-mini',
                messages: [
                    {
                        role: 'user', 
                        content: [
                        {      
                         "type": "text", 
                         "text": `Given the image provided below, do not downsize it. There is a table or tables found in the image. Please analyze this blood-typing antibody panel. Extract ALL data requested with high precision as much as possible. Follow this structured format in the response:  

1. PANEL IDENTIFICATION:
- Manufacturer: [e.g., Ortho Clinical Diagnostics, ALBA]
- Lot Number: [exact format as shown]
- Expiration Date: [YYYY-MM-DD]
- Full Test Name: [complete test name including ® symbols]
- Panel Type: [e.g., Panel A, Panel B, Panel C, Surgiscreen]

2. ANTIGEN GROUPS (in order):
List all column headers and subgroups:
- Rh-hr (D,C,E,c,e,f,Cw,V)
- KELL (K,k,Kpa,Kpb,Jsa,Jsb)
- DUFFY (Fya,Fyb)
- KIDD (Jka,Jkb)
- Sex Linked (Xga)
- LEWIS (Lea,Leb)
- MNS (S, s, M,N)
- P (P1)
- LUTHERAN (Lua,Lub)
- Special Antigen Typing
- Test Results

3. DETAILED CELL DATA:
For each row (1 to N rows), extract:
- Row Number in image Cell#
- Cell ID (name of cell row exactly as written such as "Rh-hr")
- Donor Number (6 digits)
- Results for EACH antigen (maintaining exact order)
- Remember the column where the antigen belongs to and do not mix it up.
- Special notations (HLA+, @, etc.)
- Zoom in on the table with the cell data to get better precision

4. VALIDATION RULES:
- Verify all donor numbers are 6 digits
- Valid result values: "+", "0", "/", "+s", null
- Note any special markers (HLA+, @)
- Preserve shaded column indicators

Please format as JSON:
{
  "metadata": {
    "manufacturer": "",
    "lotNumber": "",
    "expirationDate": "",
    "panelType": "",
    "testName": "",
    "shadedColumns": []
  },
  "antigenGroups": {
    "Rh-hr": ["D", "C", "E", "c", "e", "f", "Cw", "V"],
    "KELL": ["K", "k", "Kpa", "Kpb", "Jsa","Jsb"], 
    // ... continue for all groups
  },
  "cells": [
    {
      "rowNumber": "",
      "cellId": "",
      "donorNumber": "",
      "results": {
        // All antigens in order
        "D": "",
        "C": "",
        // ... continue for all antigens
      },
      "specialNotations": []
    }
  ]
}

Important:
1. Preserve ALL special characters as much as possible (®, ©)
2. Note any shaded columns
3. Include any footer notes
4. Maintain exact spelling and formatting
5. Extract all additional information shown.
6. Extract all cell data with as high precision as possible. If it looks like O or a circle, then it is 0 (i.e. zero).
7. Lub field is + but it may be 0 rarely so just remark it in json field "specialNotations".
8. Pay close attention to "+" and "/" and if it is empty return as ''
9. If you can't analyze the blood typing antibody panel image clearly as I requested, return whatever data extracted in the structured format. Add sorry or warning message only as a Remark in specialNotations.
10. Don't include cell when the whole column is empty
11. Ortho Clinical Diagnostics is a name of a Manufacturer. ALBA is another manufacturer. Other manufactures may be found as a title or in the header.`
                        },
                        {
                        "type": "image_url",
                        "image_url": {
                        "url": `${urlwithbase64data}`,
                        "detail": "high"
                            },
                        },
                     ],
                    

                    },

                        ],
            };

            console.log('Sending request to OpenAI');
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                requestBody,
                { headers }
            );

            if (!response.data.choices[0]?.message?.content) {
                throw new Error('No analysis results received from AI');
            }

            let jsonString = response.data.choices[0].message.content;
            const cleanedString = jsonString.replace(/[`]/g, '').replace(/json/g, '');

            const path = '/sdcard/Download/textractai.json';
        
            try {
        
                await RNFS.writeFile(path, cleanedString, 'utf8');
            } catch (error) 
            {
                Alert.alert(
                            'Error',
                            'Download failed' + path + ' size '+ cleanedString.length,
                            [{ text: 'OK' }]);
        
            }
            
            const aiResponse = JSON.parse(cleanedString);

            return validateAndFormatAIResponse(aiResponse);
        } catch (error) {
            console.error('Error in AI analysis:', error);
            throw new ScannerError(
                ScannerErrorCode.AI_ANALYSIS_FAILED,
                'Failed to analyze image with AI' + ' error '+ error.message,
                error instanceof Error ? error : undefined
            );
        }
    }
    // private validateAndFormatAIResponse(aiResponse: any, isFirstPanel: boolean): PanelData {
    //     try {
    //         // Validate required fields
    //         const requiredFields = ['cells', 'antigenGroups', 'metadata'];
    //         for (const field of requiredFields) {
    //             if (!aiResponse[field]) {
    //                 throw new Error(`Missing required field: ${field}`);
    //             }
    //         }

    //         // Validate metadata
    //         const metadata: PanelMetadata = {
    //             manufacturer: aiResponse.metadata.manufacturer,
    //             lotNumber: aiResponse.metadata.lotNumber,
    //             expirationDate: aiResponse.metadata.expirationDate,
    //             panelType: aiResponse.metadata.panelType as PanelType,
    //             testName: aiResponse.metadata.testName,
    //             shadedColumns: aiResponse.metadata.shadedColumns || []
    //         };

    //         // Validate panel type
    //         // if (isFirstPanel && metadata.panelType !== 'Screen') {
    //         //     throw new Error('First panel must be of type Screen');
    //         // }
    //         // if (!isFirstPanel && !['A', 'B', 'C'].includes(metadata.panelType)) {
    //         //     throw new Error('Second panel must be of type A, B, or C');
    //         // }

    //         // Extract and validate antigen groups
    //         const antigenGroups = aiResponse.antigenGroups;
    //         const antigens = Object.values(antigenGroups).flat().filter((antigen: any) => typeof antigen === 'string');

    //         // Validate and format cells
    //         const cells = aiResponse.cells.map((cell: any) => {
    //             // Validate cell data
    //             if (!cell.rowNumber || !cell.cellId || !cell.donorNumber || !cell.results) {
    //                 throw new Error(`Invalid cell data structure for cell ${JSON.stringify(cell)}`);
    //             }

    //             // Validate donor number format
    //             if (!/^\d{6}$/.test(cell.donorNumber)) {
    //                 throw new Error(`Invalid donor number format: ${cell.donorNumber}`);
    //             }

    //             // Validate result values
    //             const validValues: ResultValue[] = ['+', '0', '/', '+s', '', null];
    //             Object.entries(cell.results).forEach(([antigenId, result]) => {
    //                 if (!antigens.includes(antigenId)) return;
    //                 if (result && !validValues.includes(result as ResultValue)) {
    //                     throw new Error(`Invalid result value for antigen ${antigenId}: ${result}`);
    //                 }
    //             });

    //             const cellData: CellData = {
    //                 cellId: cell.cellId,
    //                 rowNumber: cell.rowNumber,
    //                 donorNumber: cell.donorNumber,
    //                 phenotype: cell.phenotype || '',
    //                 results: cell.results,
    //                 specialNotations: cell.specialNotations || []
    //             };

    //             return cellData;
    //         });

    //         return {
    //             cells,
    //             antigens,
    //             metadata,
    //             antigenGroups,
    //         };

    //     } catch (error) {
    //         console.error('Error in validateAndFormatAIResponse:', error);
    //         throw new ScannerError(
    //             ScannerErrorCode.PANEL_DATA_EXTRACTION_FAILED,
    //             `Failed to validate and format AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    //             error instanceof Error ? error : undefined
    //         );
    //     }
    // }

    private calculateConfidence(data: PanelData): number {
        let confidence = 1.0;

        // Check metadata completeness
        if (!data.metadata.manufacturer ||
            !data.metadata.lotNumber ||
            !data.metadata.expirationDate) {
            confidence -= 0.2;
        }

        // Check cell data completeness
        const totalCells = data.cells.length;
        const completeCells = data.cells.filter(cell =>
            cell.donorNumber &&
            Object.values(cell.results).some(result => result !== null && result !== '')
        ).length;

        // Calculate cell completeness ratio
        confidence *= (completeCells / totalCells);

        // Check antigen data consistency
        const expectedAntigens = [
            'D', 'C', 'E', 'c', 'e', 'f', 'Cw', 'V',  // Rh-hr
            'K', 'k', 'Kpa', 'Kpb', 'Jsa', 'Jsb',     // KELL
            'Fya', 'Fyb',                              // DUFFY
            'Jka', 'Jkb',                              // KIDD
            'Xga',                                     // Sex Linked
            'Lea', 'Leb',                              // LEWIS
            'S', 's', 'M', 'N',                        // MNS
            'P1',                                      // P
            'Lua', 'Lub',                              // LUTHERAN
            'Coa', 'Cob',                              // Colton
            'Dia', 'Dib'                               // Diego
        ];

        const presentAntigens = data.antigens.length;
        const antigenCompleteness = presentAntigens / expectedAntigens.length;
        confidence *= antigenCompleteness;

        // Check result validity
        let validResults = 0;
        let totalResults = 0;

        data.cells.forEach(cell => {
            Object.entries(cell.results).forEach(([_, result]) => {
                if (result !== null) {
                    totalResults++;
                    if (['+', '0', '/', '+s', ''].includes(result)) {
                        validResults++;
                    }
                }
            });
        });

        if (totalResults > 0) {
            confidence *= (validResults / totalResults);
        }

        // Ensure confidence is between 0 and 1
        return Math.max(0, Math.min(1, confidence));
    }

    public async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            Image.getSize(
                uri,
                (width, height) => {
                    resolve({ width, height });
                },
                (error) => {
                    console.error('Error getting image dimensions:', error);
                    reject(new Error('Failed to get image dimensions'));
                }
            );
        });
    }

    public setCamera(camera: Camera): void {
        this.camera = camera;
    }

    public async scanPanels(): Promise<DualScanResult> {
        if (!this.camera) {
            throw new ScannerError(
                ScannerErrorCode.CAMERA_UNAVAILABLE,
                'Camera not initialized'
            );
        }

        try {
            // Take first photo
            const firstPhoto = await this.camera.takePhoto({
                flash: 'auto',
            });

            // Small delay to allow camera to stabilize
            await new Promise(resolve => setTimeout(resolve, 500));

            // Take second photo
            const secondPhoto = await this.camera.takePhoto({
                flash: 'auto',
            });

            // Process both photos
            const result = await this.processFiles({
                first: firstPhoto.path,
                second: secondPhoto.path
            });

            return result;
        } catch (error) {
            console.error('Error in scanPanels:', error);
            throw new ScannerError(
                ScannerErrorCode.PHOTO_CAPTURE_FAILED,
                'Failed to capture and process photos',
                error instanceof Error ? error : undefined
            );
        }
    }

    // Helper method to verify panel compatibility
    public verifyPanelCompatibility(firstPanel: PanelData, secondPanel: PanelData): boolean {
        // Verify manufacturer match
        if (firstPanel.metadata.manufacturer !== secondPanel.metadata.manufacturer) {
            console.warn('Panel manufacturer mismatch');
            return false;
        }

        // Verify panel types are complementary
        // if (firstPanel.metadata.panelType !== 'Screen' ||
        //     !['A', 'B', 'C'].includes(secondPanel.metadata.panelType)) {
        //     console.warn('Invalid panel type combination');
        //     return false;
        // }

        // Verify antigen groups match
        const firstAntigens = Object.keys(firstPanel.antigenGroups).sort().join(',');
        const secondAntigens = Object.keys(secondPanel.antigenGroups).sort().join(',');
        if (firstAntigens !== secondAntigens) {
            console.warn('Antigen group mismatch');
            return false;
        }

        // Verify both panels are not expired
        // const currentDate = new Date();
        // const firstExpDate = new Date(firstPanel.metadata.expirationDate);
        // const secondExpDate = new Date(secondPanel.metadata.expirationDate);

        // if (firstExpDate < currentDate || secondExpDate < currentDate) {
        //     console.warn('One or both panels are expired');
        //     return false;
        // }

        return true;
    }

    // Helper method to combine panel results for analysis
    public combinePanelResults(first: PanelData, second: PanelData): {
        combinedAntigens: string[];
        commonCells: string[];
        conflictingResults: Array<{
            antigen: string;
            firstResult: ResultValue;
            secondResult: ResultValue;
            cellIds: string[];
        }>;
    } {
        const combinedAntigens = Array.from(
            new Set([...first.antigens, ...second.antigens])
        ).sort();

        const commonCells = first.cells
            .filter(cell1 =>
                second.cells.some(cell2 => cell1.donorNumber === cell2.donorNumber)
            )
            .map(cell => cell.donorNumber);

        const conflictingResults = [];

        for (const antigen of combinedAntigens) {
            for (const firstCell of first.cells) {
                const secondCell = second.cells.find(
                    cell => cell.donorNumber === firstCell.donorNumber
                );

                if (secondCell &&
                    firstCell.results[antigen] !== secondCell.results[antigen] &&
                    firstCell.results[antigen] !== null &&
                    secondCell.results[antigen] !== null) {
                    conflictingResults.push({
                        antigen,
                        firstResult: firstCell.results[antigen],
                        secondResult: secondCell.results[antigen],
                        cellIds: [firstCell.cellId, secondCell.cellId]
                    });
                }
            }
        }

        return {
            combinedAntigens,
            commonCells,
            conflictingResults
        };
    }
}

export default ScannerService;