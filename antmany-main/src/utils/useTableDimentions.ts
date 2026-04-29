import { useMemo } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';
import { AntigenGroups } from '../types';

export const calculateTableDimensions = (antigenGroups: AntigenGroups, additionalCellCount: number) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // Calculate total number of columns
    const totalAntigens = Object.values(antigenGroups)
        .reduce((sum, antigens) => sum + antigens.length, 0);

    const tableWidth = (screenWidth > screenHeight ? screenWidth : screenHeight);

    // Calculate width for each antigen column
    const antigenWidth = tableWidth * 1.0 / (totalAntigens + additionalCellCount);

    // Ensure minimum widths
    const minAntigenWidth = 16;
    const finalAntigenWidth = Math.max(antigenWidth, minAntigenWidth);

    return {
        cellNumberWidth: antigenWidth,
        donorIdWidth: antigenWidth * 3,
        resultWidth: antigenWidth,
        antigenWidth: antigenWidth,
        totalWidth: tableWidth,
        totalAntigens,
    };
};

export const useTableDimensions = (antigenGroups: AntigenGroups, additionalCellCount: number) => {
    const dimensions = useWindowDimensions();

    return useMemo(() =>
        calculateTableDimensions(antigenGroups, additionalCellCount),
        [dimensions.width, antigenGroups]
    );
};