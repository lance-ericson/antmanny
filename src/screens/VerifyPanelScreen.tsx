import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, SafeAreaView, TouchableOpacity, Dimensions, Alert, Modal, ActivityIndicator, BackHandler } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { PanelGrid } from '../components/PanelGrid';
import { PanelData, RuleResult, AntigenRuleState } from '../types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { calculateAntigenScore, shouldRuleOutAntigen, SPECIAL_ANTIGENS } from '../utils/ruleOutUtils';
import DatabaseService from '../services/DatabaseService';
import { useFocusEffect } from '@react-navigation/native';
import { FONTS, COLORS } from '../constants/fonts';
import CustomText from '../components/CustomText';
import * as ConstAntigens from '../services/AntigenData';
type VerifyPanelScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VerifyPanel'>;
  route: RouteProp<RootStackParamList, 'VerifyPanel'>;
};

const VerifyPanelScreen: React.FC<VerifyPanelScreenProps> = ({ route, navigation }) => {
  const { panelData, manufacturerChoice, displayAntigensByGroup, displayGroups } = route.params;//?.panelData;
  //const manufacChoice =  route.params?.manufacChoice;
  const [panel, setPanel] = useState<PanelData>(panelData);
  const [rules, setRules] = useState<RuleResult[]>([]);
  const [ruleState, setRuleState] = useState<AntigenRuleState>({});
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width > Dimensions.get('window').height ? 'landscape' : 'portrait'
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [saveType, setSaveType] = useState<'ABScreen' | 'ABIDPanel' | 'SelectCells' | null>(null);
  const [isTableProcessing, setTableIsProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lockedColumns, setLockedColumns] = useState<string[]>([]);
  const [zoomControlsVisible, setZoomControlsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [lotNumber, setLotNumber] = useState(panel.metadata?.lotNumber  || 'VSS8598');
  const [manuf, setManufacturer] = useState(panel.metadata?.manufacturer || 'Cannot Read');

  const applyManufacturerDisplayFormat = useCallback((
    sourcePanel: PanelData,
    targetManufacturer: string,
    groupMembers: Record<string, string[]>,
    groupOrder: string[]
  ): PanelData => {
    const normalizedManufacturer = targetManufacturer.trim();
    const panelAntigenSet = new Set(sourcePanel.antigens);
    const cellAntigenSet = new Set(
      sourcePanel.cells.flatMap(cell =>
        Object.keys(cell.results).filter(key => !['result', 'Grade', 'Check', 'RXN'].includes(key))
      )
    );
    const availableAntigens = Array.from(new Set([...Array.from(panelAntigenSet), ...Array.from(cellAntigenSet)]));

    const orderedGroups = [
      ...groupOrder.filter(groupName => Object.prototype.hasOwnProperty.call(groupMembers, groupName)),
      ...Object.keys(groupMembers).filter(groupName => !groupOrder.includes(groupName)),
    ];

    const formattedGroups: Record<string, string[]> = {};
    const orderedAntigens: string[] = [];

    for (const groupName of orderedGroups) {
      const groupAntigens = (groupMembers[groupName] || [])
        .filter(antigen => !!antigen && availableAntigens.includes(antigen));

      if (groupAntigens.length > 0) {
        formattedGroups[groupName] = groupAntigens;
        orderedAntigens.push(...groupAntigens);
      }
    }

    const remainingAntigens = availableAntigens.filter(antigen => !orderedAntigens.includes(antigen));
    if (remainingAntigens.length > 0) {
      formattedGroups["Other"] = remainingAntigens;
      orderedAntigens.push(...remainingAntigens);
    }

    return {
      ...sourcePanel,
      antigens: orderedAntigens,
      antigenGroups: formattedGroups as any,
      metadata: {
        ...sourcePanel.metadata,
        manufacturer: normalizedManufacturer || sourcePanel.metadata?.manufacturer,
      },
    };
  }, []);
  
  // Convert the initial expiration date string to a Date object
  const initialDate = parseDate(panel.metadata?.expirationDate || '2024-11-26');
  const [expirationDate, setExpirationDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Reference to the horizontal scroll view
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Initialize database on component mount
  useEffect(() => {
    initDatabase();
  }, []);

  // Initialize database tables if they don't exist
  const initDatabase = async () => {
    try {
      // DatabaseService handles table creation internally when initializing
      await DatabaseService.initDatabase();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  };

  // Add listener for orientation changes
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    const subscription = Dimensions.addEventListener('change', updateOrientation);

    return () => subscription.remove();
  }, []);

  // Process rules on mount
  useEffect(() => {
    processRules();
  }, [panel]);

  useEffect(() => {
    const syncDisplayFormat = async () => {
      const chosenManufacturer = (manufacturerChoice || panelData.metadata?.manufacturer || '').trim();

      if (displayAntigensByGroup && displayGroups && chosenManufacturer) {
        const formattedPanel = applyManufacturerDisplayFormat(
          panelData,
          chosenManufacturer,
          displayAntigensByGroup,
          displayGroups
        );
        setPanel(formattedPanel);
        setManufacturer(chosenManufacturer);
        return;
      }

      if (!chosenManufacturer) {
        return;
      }

      try {
        const [savedGroupMembers, savedGroupOrder] = await Promise.all([
          ConstAntigens.loadGroupMembers(chosenManufacturer),
          ConstAntigens.loadGroupOrder(chosenManufacturer),
        ]);

        const formattedPanel = applyManufacturerDisplayFormat(
          panelData,
          chosenManufacturer,
          savedGroupMembers || {},
          savedGroupOrder || []
        );
        setPanel(formattedPanel);
        setManufacturer(chosenManufacturer);
      } catch (error) {
        console.error('Failed to sync manufacturer display format:', error);
      }
    };

    syncDisplayFormat();
  }, [applyManufacturerDisplayFormat, displayAntigensByGroup, displayGroups, manufacturerChoice, panelData]);

  // Modify the useEffect hook that handles updates from PanelDetailsScreen
  useEffect(() => {
    // Check if we have updated panel details from PanelDetailsScreen
    if (route.params?.updatedPanelDetails) {
      const { lotNumber, expirationDate } = route.params.updatedPanelDetails;

      // Update the panel data with the new details
      setPanel(prevPanel => ({
        ...prevPanel,
        metadata: {
          ...prevPanel.metadata,
          lotNumber,
          expirationDate
        }
      }));

      // Clear the params after using them to prevent re-triggering
      navigation.setParams({ updatedPanelDetails: undefined });

      // Show confirmation that updates were received
      Alert.alert(
        "Panel Details Updated",
        "The panel details have been updated successfully.",
        [{ text: "OK" }]
      );
    }
  }, [route.params?.updatedPanelDetails]);

  // Disable swipe gestures completely - all data would be lost on back
  useEffect(() => {
    // Always disable gesture navigation for this screen
    navigation.setOptions({
      gestureEnabled: false
    });
  }, [navigation]);

  // Add back handler for hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Show confirmation dialog
        setModalVisible(true);
        return true; // Prevent default back action
      };

      // Add back button listener
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove(); // Cleanup on unmount
    }, [])
  );

  // Function to parse date string into Date object
  function parseDate(dateString: string): Date {
    try {
      // Try to parse the ISO format first
      const date = new Date(dateString);
      
      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        // If not valid, try to parse common formats like MM/DD/YYYY
        const parts = dateString.split(/[-\/]/);
        if (parts.length === 3) {
          // Assuming MM/DD/YYYY format
          return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
        // If all parsing fails, return tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
      return date;
    } catch (error) {
      // If any error occurs, return tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  }
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };
  

  const processRules = () => {
    const newRuleState = calculatePanelRuleState(panel);
    setRuleState(newRuleState);
    generateRules(newRuleState);
  };

  // Zoom controls - new functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Handle row deletion
  const handleRowDelete = (index: number) => {
    setPanel(prevPanel => {
      // Create a new panel with the specified row removed
      const updatedCells = [...prevPanel.cells];
      updatedCells.splice(index, 1);

      return {
        ...prevPanel,
        cells: updatedCells,
      };
    });

    // Re-process rules after deletion
    setTimeout(() => {
      processRules();
    }, 0);
  };

  const calculatePanelRuleState = (
    panel: PanelData,
  ): AntigenRuleState => {
    const newRuleState: AntigenRuleState = {};

    panel.antigens.forEach(antigen => {
      const score = calculateAntigenScore(panel.cells, antigen);
      const isSpecialAntigen = SPECIAL_ANTIGENS.includes(antigen);

      // Determine if the antigen should be ruled out
      const shouldRuleOut = shouldRuleOutAntigen(
        antigen,
        score,
        newRuleState,
      );

      newRuleState[antigen] = {
        isRuledOut: shouldRuleOut,
        overridden: null,
        heterozygousCount: score.heterozygousCount,
        homozygousCount: score.homozygousCount,
        manualOverride: false,
        cells: score.supportingCells,
        score: score.totalScore,
        isSpecialAntigen
      };
    });

    return newRuleState;
  };

  const generateRules = (state: AntigenRuleState) => {
    const newRules: RuleResult[] = [];

    Object.entries(state).forEach(([antigen, data]) => {
      // Handle homozygous rules
      if (data.homozygousCount > 0) {
        newRules.push({
          type: 'homozygous',
          antigen: antigen,
          confidence: 1,
          cells: data.cells,
          indicator: 'X'
        });
      }

      // Handle heterozygous special cases (K, C, E)
      if (SPECIAL_ANTIGENS.includes(antigen)) {
        const requiredCount = antigen === 'K' ? 1 : 2;
        if (data.heterozygousCount >= requiredCount) {
          // For C/E, check if D is not ruled out
          if (antigen === 'K' || !state['D']?.isRuledOut) {
            newRules.push({
              type: 'heterozygous',
              antigen: antigen,
              confidence: data.heterozygousCount / requiredCount,
              cells: data.cells,
              indicator: 'slash'
            });
          }
        }
      }
    });

    setRules(newRules);
  };

  const handleCellPress = (index: number, antigenId: string) => {
    // Skip if column is locked
    if (lockedColumns.includes(antigenId)) {
      return;
    }

    setPanel(prev => {
      const updatedPanel = { ...prev };
      const cell = updatedPanel.cells[index];

      if (cell) {
        const currentResult = cell.results[antigenId];
        let newValue: '+' | '0' | '/' | '+s' | '+w' | 'NT' | '';

        // Cycle through possible values
        switch (currentResult) {
          case '0': newValue = '+'; break;
          case '+': newValue = '/'; break;
          case '/': newValue = '+s'; break;
          case '+s': newValue = '+w'; break;
          case '+w': newValue = 'NT'; break;
          default: newValue = '0';
        }

        cell.results[antigenId] = newValue;
      }

      return updatedPanel;
    });
  };

  const handleResultPress = (index: number) => {
    // setPanel(prev => {
    //   const updatedPanel = { ...prev };
    //   const cell = updatedPanel.cells[index];

    //   if (cell) {
    //     const currentResult = cell.results['result'] || '';
    //     let newValue: '+' | '0' | '';

    //     // Only allow + and 0 for result column
    //     switch (currentResult) {
    //       case '': newValue = '+'; break;
    //       case '+': newValue = '0'; break;
    //       default: newValue = '';
    //     }

    //     cell.results['result'] = newValue;
    //   }

    //   return updatedPanel;
    // });
  };

  const handleGoBack = () => {
    setModalVisible(true);
  };

  const confirmGoBack = () => {
    setModalVisible(false);
    navigation.goBack();
  };

  const cancelGoBack = () => {
    setModalVisible(false);
  };

  const handleShowDetails = () => {
    navigation.navigate('PanelDetails', {
      lotNumber: panel.metadata?.lotNumber || 'VSS8598',
      expirationDate: panel.metadata?.expirationDate || '2024-11-26'
    });
  };

  // Add this function to check for duplicates before saving
  const checkForDuplicates = async (lotNumber: string, expirationDate: string): Promise<boolean> => {
    try {
      // Instead of using static methods, use instance methods
      // Use an alternative approach with the available methods:

      // Query for files of each relevant type
      const abScreenFiles = await DatabaseService.getFiles({ type: 'ABScreen' });
      const abidPanelFiles = await DatabaseService.getFiles({ type: 'ABIDPanel' });
      const selectCellsFiles = await DatabaseService.getFiles({ type: 'SelectCells' });

      // Combine all files
      const allPanelFiles = [...abScreenFiles, ...abidPanelFiles, ...selectCellsFiles];

      // Check each file for matching lot number and expiration date
      for (const file of allPanelFiles) {
        try {
          if (file && file.data) {
            const panelData = JSON.parse(file.data);

            if (
              panelData.metadata?.lotNumber === lotNumber &&
              panelData.metadata?.expirationDate === expirationDate
            ) {
              console.log('Duplicate panel found:', file.name);
              return true; // Duplicate found
            }
          }
        } catch (error) {
          console.error('Error parsing panel data:', error);
          // Continue checking other files
        }
      }

      // No duplicates found
      return false;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false; // Assume no duplicates in case of error
    }
  };

  // Modify the savePanelData function to check for duplicates
  const savePanelData = async (type: 'ABScreen' | 'ABIDPanel' | 'SelectCells') => {
    try {
      setTableIsProcessing(true);

      // Check for duplicates before saving
      const lotNumber = panel.metadata?.lotNumber || '';
      const expirationDate = panel.metadata?.expirationDate || '';

      const isDuplicate = await checkForDuplicates(lotNumber, expirationDate);

      if (isDuplicate) {
        setTableIsProcessing(false);

        // Ask user whether to continue with save (overwrite) or cancel
        Alert.alert(
          'Duplicate Panel Found',
          `A panel with lot number '${lotNumber}' and expiration date '${expirationDate}' already exists. Do you want to save anyway?`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Save Anyway',
              onPress: () => {
                // Proceed with saving
                actualSavePanelData(type);
              }
            }
          ]
        );
        return;
      }

      // No duplicates found, proceed with saving
      actualSavePanelData(type);

    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        'An error occurred while saving panel data',
        [{ text: 'OK' }]
      );
    } finally {
      setTableIsProcessing(false);
    }
  };

  // Extract the actual saving logic to a separate function to avoid code duplication
  const actualSavePanelData = async (type: 'ABScreen' | 'ABIDPanel' | 'SelectCells') => {
    try {
      setTableIsProcessing(true);

      // Generate timestamp for naming and created_at
      const timestamp = new Date().toISOString();
      const panelName = `${type}_${timestamp}`;

      // Process expiration date to remove time portion if it exists
      if (panel.metadata?.expirationDate) {
        // Parse the date and format it to keep only YYYY-MM-DD
        const expDate = new Date(panel.metadata.expirationDate);
        panel.metadata.expirationDate = expDate.toISOString().split('T')[0];
      }

      // Prepare panel data including rules and rule state
      const panelDataWithRules = {
        ...panel,
        rules,
        ruleState,
        metadata: {
          ...panel.metadata,
          panelType: type,
          saveDate: timestamp
        }
      };

      // Convert to JSON string for storage
      const panelJson = JSON.stringify(panelDataWithRules);

      // Use the saveFile method to store the panel
      const fileId = await DatabaseService.saveFile({
        name: panelName,
        type,
        data: panelJson,
        created_at: timestamp
      });

      setTableIsProcessing(false);

      if (fileId) {
        // Show success message
        Alert.alert(
          'Success',
          `Panel data saved successfully as ${type}`,
          [
            {
              text: 'OK',
                onPress: () => navigation.navigate('ProcessImage', {})
            }
          ]
        );
      } else {
        // Show failure message
        Alert.alert(
          'Error',
          'Failed to save panel data',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        'An error occurred while saving panel data',
        [{ text: 'OK' }]
      );
    } finally {
      setTableIsProcessing(false);
    }
  };

  // Show confirmation dialog before saving
  const handleSave = (type: 'ABScreen' | 'ABIDPanel' | 'SelectCells') => {
    setSaveType(type);
    setShowConfirmationModal(true);
  };

  // Update handleConfirmSave to use the new saving function with duplicate check
  const handleConfirmSave = () => {
    setShowConfirmationModal(false);
    if (saveType) {
      savePanelData(saveType);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmationModal(false);
  };

  // Updated handlers with save confirmation
  const handleSaveAsABScreen = () => {
    handleSave('ABScreen');
  };

  const handleSaveAsABIDPanel = () => {
    handleSave('ABIDPanel');
  };

  const handleSaveAsSelectCells = () => {
    handleSave('SelectCells');
  };

  // Add handler for column deletion
  const handleColumnDelete = (antigen: string) => {
    setPanel(prevPanel => {
      // Create a new panel with the specified column removed
      const updatedPanel = { ...prevPanel };

      // Remove the antigen from the antigens array
      updatedPanel.antigens = prevPanel.antigens.filter(a => a !== antigen);

      // Remove the antigen from each cell's results
      updatedPanel.cells = prevPanel.cells.map(cell => {
        const newResults = { ...cell.results };
        delete newResults[antigen];
        return { ...cell, results: newResults };
      });

      return updatedPanel;
    });

    // Re-process rules after deletion
    setTimeout(() => {
      processRules();
    }, 0);
  };

  // Add handler for column locking/unlocking
  const handleColumnLock = (antigen: string) => {
    setLockedColumns(prev => {
      if (prev.includes(antigen)) {
        // If already locked, unlock it
        return prev.filter(a => a !== antigen);
      } else {
        // If not locked, lock it
        return [...prev, antigen];
      }
    });
  };

  // Render confirmation dialog
  const renderConfirmationModal = () => (
    <Modal
      visible={showConfirmationModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelSave}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Save</Text>
          <Text style={styles.modalText}>
            Are you sure you want to save as {saveType}?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSave}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmSave}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Replace current renderZoomControls function with this new version
  const renderZoomControls = () => (
    <View style={styles.zoomControlsContainer}>
      {/* Floating button to show/hide zoom controls */}
      <TouchableOpacity
        style={styles.zoomFloatingButton}
        onPress={() => setZoomControlsVisible(!zoomControlsVisible)}
      >
        <Icon name="magnify-plus-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Popup with zoom controls */}
      {zoomControlsVisible && (
        <View style={styles.zoomControlsPopup}>
          <IconButton
            icon="minus"
            size={24}
            mode="contained-tonal"
            onPress={handleZoomOut}
            disabled={zoomLevel <= 0.5}
          />
          <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
          <IconButton
            icon="plus"
            size={24}
            mode="contained-tonal"
            onPress={handleZoomIn}
            disabled={zoomLevel >= 2.0}
          />
          <IconButton
            icon="refresh"
            size={24}
            mode="contained-tonal"
            onPress={handleResetZoom}
            disabled={zoomLevel === 1.0}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1A1A1A" />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>

      {/* Fixed position zoom controls that stay in place during scrolling */}
      {renderZoomControls()}

      <View style={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalScroll}
          ref={horizontalScrollRef}
        >
          <PanelGrid
            panel={panel}
            rules={rules}
            ruleState={ruleState}
            isRenderResultCell={false}
            additionalCellCount={0}
            combinedRuleState={ruleState}
            editable={true}
            onCellPress={handleCellPress}
            onResultPress={handleResultPress}
            onRowDelete={handleRowDelete}
            onColumnDelete={handleColumnDelete}
            onColumnLock={handleColumnLock}
            lockedColumns={lockedColumns}
            zoomLevel={zoomLevel}
            stickyHeaders={true}
            showHeaders={true}
          />
        </ScrollView>
      </View>
      {/* <CustomText variant="medium" style={styles.midText}>
      {'TEST PRINT\n\n\n'}
    </CustomText> */}

        <View style={styles.fieldContainer}>
          {isEditing ? (
            <TextInput
              style={styles.fieldTextInput}
              value={manuf}
              onChangeText={(value) => {
                setManufacturer(value);
                setPanel(prevPanel => ({
                  ...prevPanel,
                  metadata: {
                    ...prevPanel.metadata,
                    manufacturer: value,
                  }
                }));
              }}
              placeholder="Manufacturer"
            />
          ) : (
            <Text style={styles.fieldText}>Manufacturer: {panel.metadata?.manufacturer}</Text>
            
          )}
        </View> 

        <View style={styles.fieldContainer}>
          {isEditing ? (
            <TextInput
              style={styles.fieldTextInput}
              value={panel.metadata?.lotNumber || 'VSS8598'}
              onChangeText={setLotNumber}
              placeholder="Lot Number"
            />
          ) : (
            <Text style={styles.fieldText}>Lot # {panel.metadata?.lotNumber || 'Cannot Read'}</Text>
          )}
        </View> 

                <View style={styles.fieldContainer}>
          {isEditing ? (
            <TouchableOpacity 
              /* onPress={showDatepicker} */
              style={styles.datePickerButton}
            >
              <Text style={styles.datePickerText}>
                {formatDate(expirationDate)}
              </Text>
              <Icon name="calendar" size={24} color="#333" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.fieldText}>
              Expiration Date: {formatDate(expirationDate)}
            </Text>
          )}
          
        {/*   {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={expirationDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              // minimumDate={new Date(new Date().setDate(new Date().getDate() + 1))} // Set minimum date to tomorrow
            />
          )} */}
        </View>   
    
      <View style={[
        styles.buttonsContainer,
        orientation === 'portrait' && styles.buttonsPortraitContainer
      ]}>
        <Button
          mode="contained"
          style={styles.button}
          buttonColor="#6B96AC"
          textColor="#FFFFFF"
          onPress={handleSaveAsABScreen}
          disabled={isTableProcessing}
        >
          Save as ABScreen
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          buttonColor="#6B96AC"
          textColor="#FFFFFF"
          onPress={handleSaveAsABIDPanel}
          disabled={isTableProcessing}
        >
          Save as ABID panel
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          buttonColor="#6B96AC"
          textColor="#FFFFFF"
          onPress={handleSaveAsSelectCells}
          disabled={isTableProcessing}
        >
          Save as Select Cells
        </Button>
      </View>

      {/* Render confirmation modal */}
      {renderConfirmationModal()}

      {/* Loading indicator */}
      {isTableProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6B96AC" />
          <Text style={styles.loadingText}>Saving data...</Text>
        </View>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={cancelGoBack}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Are you sure you want to go back?</Text>
            <Text style={styles.modalText}>All entered data will be lost!</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmGoBack}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelGoBack}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    marginRight: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Zoom controls styled as fixed position
  zoomControlsContainer: {
    position: 'absolute',
    top: 100, // Position below the header
    right: 0,
    zIndex: 999, // Ensure it stays on top of all content
  },
  zoomFloatingButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B96AC91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControlsPopup: {
    position: 'absolute',
    top: -16, // Position below the button
    right: 32,
    paddingRight: 30,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  zoomText: {
    fontSize: 14,
    marginHorizontal: 4,
    fontWeight: '500',
  },
      midText: {
    fontSize: 12,
    color: COLORS.TEXT,
    textAlign: 'left',
    fontFamily: FONTS.POPPINS_BOLD,
  },
  fieldContainer: {
    backgroundColor: '#B8B8B8',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    justifyContent: 'center',
  },
  fieldText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 10,
  },  
  input: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    padding: 0,
    height: 25,
  },  
 fieldTextInput: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    backgroundColor: '#FFFFFF', // White background makes the shadow visible
    paddingHorizontal: 4,      // Space inside the box for text
    paddingVertical: 1,
    borderRadius: 3,            // Rounded corners
    borderWidth: 2,             // Subtle border
    borderColor: '#E0E0E0',
    
    // --- Shadow for iOS ---
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,

    // --- Shadow for Android ---
    elevation: 3, 
    
    // Ensure the box doesn't collapse
    minHeight: 36,
    marginVertical: 1,
  },
  // Table content
  horizontalScroll: {
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buttonsPortraitContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 6,
    backgroundColor: '#6B96AC',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1A1A1A',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#6B96AC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginLeft: 10,
    backgroundColor: '#E0E0E0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
});

export default VerifyPanelScreen;
