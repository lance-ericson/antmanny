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

export class ScannerService {
   private readonly maxFileSize = 50 * 1024 * 1024; // 10MB

    constructor() {

    }

    private uploadImage = async (base64Image: string): Promise<string | null> => {
            return null; 
    };

    public async processFiles(files: { first: string; second: string }): Promise<DualScanResult | null> {
        return null; 
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

    public async processFile(fileUri: string, isFirstPanel: boolean): Promise<ScanResult | null> {
        return null; 
    }

       public async processFile2(jsonData: string, isFirstPanel: boolean): Promise<ScanResult | null> {
        return null; 
    }



// 1. Update the signature to allow null
private async analyzeImageWithAI(url: string, isFirstPanel: boolean): Promise<PanelData | null> {
    
    // 2. Return null directly
    return null; 
}


    private calculateConfidence(data: PanelData): number {
        

        return 0;

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

    public async scanPanels(): Promise<DualScanResult | null> {
        return null; 
    }

    // Helper method to verify panel compatibility
    public verifyPanelCompatibility(firstPanel: PanelData, secondPanel: PanelData): boolean {
        

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