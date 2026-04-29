import { CellData, PanelData, PanelMetadata, PanelType, ResultValue } from '../types/index';

export const validateAndFormatAIResponse = (aiResponse: any): PanelData => {
    try {

        console.log(aiResponse);
        // Validate required fields
        const requiredFields = ['cells', 'antigenGroups', 'metadata'];
        for (const field of requiredFields) {
            if (!aiResponse[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate metadata
        const metadata: PanelMetadata = {
            manufacturer: aiResponse.metadata.manufacturer,
            lotNumber: aiResponse.metadata.lotNumber,
            expirationDate: aiResponse.metadata.expirationDate,
            panelType: aiResponse.metadata.panelType as PanelType,
            testName: aiResponse.metadata.testName,
            shadedColumns: aiResponse.metadata.shadedColumns || []
        };

        // Validate panel type
        // if (isFirstPanel && metadata.panelType !== 'Screen') {
        //     throw new Error('First panel must be of type Screen');
        // }
        // if (!isFirstPanel && !['A', 'B', 'C'].includes(metadata.panelType)) {
        //     throw new Error('Second panel must be of type A, B, or C');
        // }

        // Extract and validate antigen groups
        const antigenGroups = aiResponse.antigenGroups;
        const antigens = Object.values(antigenGroups).flat().filter((antigen: any) => typeof antigen === 'string');

        // Validate and format cells
        const cells = aiResponse.cells.map((cell: any) => {
            // Validate cell data
            // if (!cell.rowNumber || !cell.cellId || !cell.donorNumber || !cell.results) {
            //     throw new Error(`Invalid cell data structure for cell ${JSON.stringify(cell)}`);
            // }

            // // Validate donor number format
            // if (!/^\d{6}$/.test(cell.donorNumber)) {
            //     throw new Error(`Invalid donor number format: ${cell.donorNumber}`);
            // }

            // // Validate result values
            // const validValues: ResultValue[] = ['+', '0', '/', '+s', '', null];
            // Object.entries(cell.results).forEach(([antigenId, result]) => {
            //     if (!antigens.includes(antigenId)) return;
            //     if (result && !validValues.includes(result as ResultValue)) {
            //         throw new Error(`Invalid result value for antigen ${antigenId}: ${result}`);
            //     }
            // });

            const cellData: CellData = {
                cellId: cell.cellId,
                rowNumber: cell.rowNumber,
                donorNumber: cell.donorNumber,
                phenotype: cell.phenotype || '',
                results: cell.results,
                specialNotations: cell.specialNotations || []
            };

            return cellData;
        });

        return {
            cells,
            antigens,
            metadata,
            antigenGroups,
        };

    } catch (error) {
        console.error('Error in validateAndFormatAIResponse:', error);
        throw new Error(
            `Failed to validate and format AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}