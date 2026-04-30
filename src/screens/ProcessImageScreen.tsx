import React, { useState, useEffect, useRef  } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, pick, types } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { FONTS, COLORS } from '../constants/fonts';
import CustomText from '../components/CustomText';
import { ScannerService } from '../services/scannerService';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
//import fs from 'react-native-fs';
import { RNS3 } from 'react-native-aws3';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const API_ENDPOINT = "https://8pshngn4xe.execute-api.us-west-2.amazonaws.com/default/getTextractDownloadUrl";
import RNFS from 'react-native-fs';
import { Picker } from '@react-native-picker/picker';
import * as ConstAntigens from '../services/AntigenData';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProcessImageScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProcessImage'>;
  route: RouteProp<RootStackParamList, 'ProcessImage'>;
};

// Define a fallback color for disabled state
const DISABLED_COLOR = '#cccccc';

const ProcessImageScreen: React.FC<ProcessImageScreenProps> = ({ navigation, route }) => {
  const [isLoadingImage, setLoadingImage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false);
  const [showRawFolderModal, setShowRawFolderModal] = useState(false);
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width > Dimensions.get('window').height ? 'landscape' : 'portrait'
  );
  
  // New state variables for the two images
  const [firstImage, setFirstImage] = useState<string | null>(null);
  const [secondImage, setSecondImage] = useState<string | null>(null);
  const [currentImageSelection, setCurrentImageSelection] = useState<'first' | 'second'>('first');
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const cameraRef = React.useRef<Camera>(null);
  const [manuNameChoice, setManuNChoice] = useState("ALBA"); 
  
  // Camera setup like in ScannerScreen
  const devices = useCameraDevices();
  const device = React.useMemo(() => {
    return devices.find(d => d.position === 'back');
  }, [devices]);
  
  // Create reference to scanner service
  const scannerService = React.useRef(new ScannerService()).current;

  // Set up orientation change detection
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.width > window.height ? 'landscape' : 'portrait');
    });
    
    return () => subscription.remove();
  }, []);
  
// Inside your component:
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (isLoadingImage) {
    // Fade IN
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true, // Better performance
    }).start();
  } else {
    // Reset to 0 when hidden
    fadeAnim.setValue(0);
  }
}, [isLoadingImage]);

  // Check camera permissions on mount like in ScannerScreen
  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    // Check if we should open the gallery immediately
    if (route.params?.showGallery) {
      handleSelectFromDevice();
    }
  }, [route.params?.showGallery]);

  const checkPermissions = async () => {
    const cameraPermission = await Camera.requestCameraPermission();
    setHasPermission(cameraPermission === 'granted');
  };

  const toggleCamera = () => {
    setCameraActive(prev => !prev);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'SignIn' }],
    });
  };

// Allow the ref to hold either an AbortController OR null
const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    // Use the optional chaining (?.) to safely call abort if it exists
    abortControllerRef.current?.abort(); 
    setIsProcessing(false);
  };


  // Load settings db
  const { 
    manufacturers, 
    setManufacturers,
    selectedAnt, 
    setSelected, 
    isLoading, 
    refreshList,
    groups, setGroups, 
  } = ConstAntigens.useLoadAntigenSettings(manuNameChoice);


  // Modified to use the ScannerScreen approach for processing
  const processImageResult = async (uri: string) => {
    try {
      //setIsProcessing(true);
      console.log('Processing image:', uri);
      const normalizedManuNameChoice = manuNameChoice.trim();
      const [groupMembersSettings, orderedGroups] = await Promise.all([
        ConstAntigens.loadGroupMembers(normalizedManuNameChoice),
        ConstAntigens.loadGroupOrder(normalizedManuNameChoice),
      ]);

      // Use the public processFiles method with the required parameters
      const scanResult = await scannerService.processFile2(uri, true, normalizedManuNameChoice, selectedAnt, groups);
      console.log('Scan completed, navigating to VerifyPanel');
      
      // Navigate to the new VerifyPanel screen
      navigation.navigate('VerifyPanel', { 
        panelData: scanResult.results,
        manufacturerChoice: normalizedManuNameChoice,
        displayAntigensByGroup: groupMembersSettings,
        displayGroups: orderedGroups,
      });
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(
        'Error',
        'Failed to process the image. Please try again.' + ' error '+ error
      );
    } finally {
      //setIsProcessing(false);
    }
  };


  const handleCameraCapture = () => {
    // Navigate to ImageCapture and handle image when returning
    //navigation.navigate('ImageCapture', { imageUri: undefined });
  };

  const handleSelectFile = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
        includeBase64: true,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Image selection failed');
      }

      if (result.assets && result.assets[0]?.uri) {
        // Process the selected image directly
        await processImageResult(result.assets[0].uri);
      } else {
        throw new Error('No image selected');
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert(
        'Error',
        'Failed to select image from gallery. Please try again.'
      );
    }
  };

  const MAX_NB_RETRY = 100;
  const RETRY_DELAY_MS = 100;

  // Helper to wait without blocking the thread
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async function fetchRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let retryLeft = MAX_NB_RETRY;

    while (retryLeft >= 0) {
      try {
        const response = await fetch(input, init);
        
        // Return if successful OR if we are out of retries
        if (response.ok || retryLeft === 0) return response;
        
      } catch (err) {
        if (retryLeft === 0) throw err; // Re-throw if it's the last attempt
      }

      // Wait before retrying: gets longer each time (1s, 2s, 4s...)
      const backoff = RETRY_DELAY_MS;// * (MAX_NB_RETRY - retryLeft + 1);
      await sleep(backoff);
      retryLeft--;
    }

    throw new Error('Fetch failed after retries');
  }

  async function downloadTextractOutput(fileKey: string) {
    try {
      // 1. Get the Presigned URL
      const response = await fetchRetry(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }

      const { downloadUrl } = await response.json();
      console.log('Presigned URL received');

      // 2. Download the actual file content
      const fileResponse = await fetchRetry(downloadUrl);
      
      if (!fileResponse.ok) {
        throw new Error(`Download failed: ${fileResponse.statusText}`);
      }

      const textractOutput = await fileResponse.text();
      const path = '/sdcard/Download/textract.json';

      // 3. Save to storage
      try {
        await RNFS.writeFile(path, textractOutput, 'utf8');
        console.log('Download complete! Size:', textractOutput.length);
      } catch (writeError) {
        //Alert.alert('Storage Error', `Could not save file to ${path}`);
      }

      return textractOutput;

    } catch (error: any) {
      console.error('Download process failed:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      throw error;
    }
  }

  /**
   * 1. GET THE TEMPORARY KEY (URL)
   */
  const getUploadUrl = async (fileName: string, fileType: string) => {
    const FUNCTION_URL = 'https://vmtiryw74hrppawgbqoqvdsl7y0jugpc.lambda-url.us-west-2.on.aws';

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType }),
    });

    if (!response.ok) throw new Error(`Lambda error: ${response.status}`);

    const data = await response.json();
    return data.uploadUrl;
  };

  /**
   * 2. SIMPLE SECURE UPLOAD
   */
  const uploadFileSecurely = async (fileUri: string, fileName: string, fileType: string) => {
    try {
      // A. Get the link from Lambda
      const uploadUrl = await getUploadUrl(fileName, fileType);

      // B. Upload directly to S3
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: { uri: fileUri, type: fileType, name: fileName } as any,
        headers: { 'Content-Type': fileType },
      });

      if (!response.ok) throw new Error(`S3 Upload failed: ${response.status}`);

      console.log('✅ Upload Success!');
      return true;
    } catch (error) {
      console.error('Secure upload failed:', error);
      throw error;
    }
  };

  const handleSelectFile2 = async () => {

    try {
      setIsProcessing(false); 
      const folderPrefix = "images4textracts"; // 16-char folder
     // 1. Start the spinner
      setLoadingImage(true); 
 
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
        includeBase64: false,
      });

      let base64ImageString : string = 'base64string';
      
      if (result.didCancel) {
        setLoadingImage(false); 
        return;
      }

      if (result.errorCode) {
        setLoadingImage(false); 
        throw new Error(result.errorMessage || 'Image selection failed');
      }


      if (result.assets && result.assets[0]?.uri) {
        // Process the selected image directly     
      } else {
        setLoadingImage(false); 
        throw new Error('No image selected');
      }      
            
      const localuri = result.assets[0].uri;//Buffer.from(base64).toString('base64');

      const file = {
        uri: localuri,
        name:  `pix-${folderPrefix}-${result.assets[0].fileName}`, // Provide a name for the file in S3
        type: result.assets[0].type, 
      };

      
      // 3. Attempt the Secure Upload
        try {
          // Use the helper we built earlier
          await uploadFileSecurely(
            localuri, 
            `pix-${folderPrefix}-${result.assets[0].fileName}`, 
            result.assets[0].type || 'image/jpeg'
          );

          // You can add a "Success" alert or navigate here
          
        } catch (uploadError) {
          // Specific error handling for the upload phase
          console.error('Upload Error:', uploadError);
          Alert.alert(
            'Upload Failed',
            'Your image could not uploaded. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
          // We don't "re-throw" here if we want the function to finish gracefully
        } finally {
          setLoadingImage(false); 
        }

      // Create a new controller for this specific attempt
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        setIsProcessing(true);
      
        const fileKey = folderPrefix + '/txtrakResp.json'; //txtrakResp.txt';
        const output = await downloadTextractOutput(fileKey);
        //  .then((output: string) => processImageResult(output) /*console.log(output)*/);
        // use the image base64 string to pass to openai
        //processImageResult(base64ImageString);
          //.catch(error => console.error(error));
        await processImageResult(output);

      } catch(error: any) {
        if (error.name === 'AbortError') {
              console.log('User cancelled the process');
            } else {
              Alert.alert(
              'Error',
              'Download or processing failed. ' + ' error '+ error);
            }        
      } finally {
          abortControllerRef.current = null; // Reset to null after completion
          setIsProcessing(false);
      }

    const DELETE_URL = 'https://3opdllvm3tytul74wqmef5lgqa0nonxc.lambda-url.us-west-2.on.aws/';
    const fileKey = folderPrefix + '/txtrakResp.json'; //txtrakResp.txt';
    try {
      const response = await fetch(DELETE_URL, {
        method: 'DELETE', // Use DELETE method
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey })
      });
      
      if (response.ok) {
        console.log('File deleted successfully');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert(
        'Delete Error',
        'Error deleting object ' + error,
        [{ text: 'OK' }]);
    }

      } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert(
        'Error',
        'Failed to select image from gallery. Please try again.'+ error
      );
    }

  };

  const onManufacturerChange = async (newName: string) => {
      const normalizedNewName = newName.trim();
      if (!normalizedNewName) return; 

      // 1. Update choice state immediately for UI highlighting
      setManuNChoice(normalizedNewName);

      // 2. Fetch data using the normalized name
      const [settings, order] = await Promise.all([
        ConstAntigens.loadSettingsForManufacturer(normalizedNewName),
        ConstAntigens.loadGroupOrder(normalizedNewName)
      ]);

      // 3. Apply safe fallbacks for new manufacturers
      setSelected(settings || {});
      setGroups(order || ConstAntigens.DEFAULT_GROUP_ORDER);
      
  };  
    
  const handleSelectRawFolder = () => {
    setShowFileSelectionModal(false);
    setShowRawFolderModal(true);
  };

  const handleSelectFromDevice = async () => {
    setShowFileSelectionModal(false);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Image selection failed');
      }

      if (result.assets && result.assets[0]?.uri) {
        // Process the selected image directly
        await processImageResult(result.assets[0].uri);
      } else {
        throw new Error('No image selected');
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert(
        'Error',
        'Failed to select image from gallery. Please try again.'
      );
    }
  };

  // const handleSelectFolder = (folderName: string) => {
  //   navigation.navigate('FileListScreen', { folderName: 'Raw Panels' });
  //   setShowRawFolderModal(false);
  // };

  const handleCloseRawFolderModal = () => {
    setShowRawFolderModal(false);
  };

  const handleCloseFileSelectionModal = () => {
    setShowFileSelectionModal(false);
  };

  // Mock raw folder data
  const rawFolders = Array.from({ length: 12 }, (_, i) => ({
    id: `${i + 1}`,
    name: `03.25.2025 Lot # ${i + 1}`,
    isSelected: false,
  }));

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-left" size={24} color={COLORS.PRIMARY} />
          <CustomText variant="medium" style={styles.backText}>Go back</CustomText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <CustomText variant="medium" style={styles.logoutText}>Log out</CustomText>
          <Icon name="logout" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
    </>
  );

  const handleMenuPress = () => {
      navigation.navigate("AntigenDispSettings");
  };

  const renderContent = () => (
    <>
      <CustomText variant="medium" style={styles.screenTitle}>
        {isProcessing ? 'Processing...' : 'Process Image'}
      </CustomText>
        {/* Option Cards */}
    {/* <View style={[
      styles.optionsContainer,
      orientation === 'landscape' && styles.optionsContainerLandscape
    ]}>
      <CustomText variant="medium" style={styles.midText}>
      {'\n'}
    </CustomText>  
      </View>     */}
      <View style={styles.pickercontainer}>
      {/* <View style={[
        styles.optionsContainer,
        orientation === 'landscape' && styles.optionsContainerLandscape
      ]}> */}
        { <Text style={styles.fieldText}>Choose a Manufacturer:</Text>
         }
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={manuNameChoice}
            onValueChange={(itemValue) => onManufacturerChange(itemValue)}
            style={styles.picker}
            dropdownIconColor="#007AFF"
          >
            <Picker.Item label="Select Manufacturer..." value="" />
            
            {/*ConstAntigens.ANTIGEN_MANUFACTURERS*/(manufacturers || [])
              .filter(manufacturer => manufacturer !== "Create New")
              .map((manufacturer, index) => (
                <Picker.Item 
                  key={`${manufacturer}-${index}`} 
                  label={manufacturer} 
                  value={manufacturer} 
              />
            ))}
          </Picker>         

          {/* The pointerEvents="none" ensures the picker still opens when clicking the icon */}
          {/* <View style={styles.iconOverlay} pointerEvents="none">
            <Text style={styles.chevron}>▼</Text>
          </View> */}
        </View>
      <View style={[
        styles.optionsContainer,
        orientation === 'landscape' && styles.optionsContainerLandscape
      ]}>
        <CustomText variant="medium" style={styles.midText}>
        {'\n'}
      </CustomText>  
      </View>  

    <View style={[
      styles.optionsContainer,
      orientation === 'landscape' && styles.optionsContainerLandscape
    ]}>
    {/* <CustomText variant="medium" style={styles.midText}>
      {'Capture panel image \nusing your device camera \nand upload the image file \n by clicking below:\n\n\n'}
    </CustomText> */}
      {/* Camera Capture Card */}
      {/* <TouchableOpacity 
        style={[
          styles.optionCard,
          orientation === 'landscape' && styles.optionCardLandscape
        ]}
        onPress={handleCameraCapture}
        disabled={isProcessing}
      >
        <Icon name="camera" size={60} color={isProcessing ? DISABLED_COLOR : COLORS.TEXT} />
        <CustomText variant="medium" style={[
          styles.optionText,
          isProcessing && styles.disabledText
        ]}>Camera Capture</CustomText>
      </TouchableOpacity> */}

      {/* Select File Card */}
      <TouchableOpacity 
        style={[
          styles.optionCard,
          orientation === 'landscape' && styles.optionCardLandscape
        ]}
        onPress={handleSelectFile2}
        disabled={isProcessing}
      >
        <Icon name="folder-download" size={60} color={isProcessing ? DISABLED_COLOR : COLORS.TEXT} />
        <CustomText variant="medium" style={[
          styles.optionText,
          isProcessing && styles.disabledText
        ]}>Select from Files</CustomText>
      </TouchableOpacity>
      {/* Spinner displays only when isLoading is true */}
           
      {isLoadingImage && (
        <Animated.View style={[styles.loaderContainer, { opacity: fadeAnim }]}>
          <View style={styles.loadingContent}>
            
            {/* 1. Standard Activity Indicator */}
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            
            {/* 2. Text with a subtle pulse (Optional) */}
            <Text style={styles.loadingText}>Loading image...</Text>
            
            {/* Your Cancel button would go here */}
          </View>
        </Animated.View>    
      )}      
    </View>
      <View style={[
        styles.optionsContainer,
        orientation === 'landscape' && styles.optionsContainerLandscape
      ]}>
        <CustomText variant="medium" style={styles.midText}>
        {'\n'}
      </CustomText>  
      </View>  
      <View style={[
        styles.optionsContainer,
        orientation === 'landscape' && styles.optionsContainerLandscape
      ]}>
        <CustomText variant="medium" style={styles.midText}>
        {'\n'}
      </CustomText>  
      </View>  

        {/* <TouchableOpacity
                  style={styles.menuContainer}
                  onPress={() => handleMenuPress()}>
                <Text style={styles.menuText}>Or Go to Settings of Antigrams</Text>
                </TouchableOpacity> */}
      </View>


    </>
  );

  const renderLoading = () => {
    if (!isProcessing) return null;
    
    return (
      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel} // Handles Android hardware back button
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <CustomText variant="medium" style={styles.loadingText}>
              Processing Image...
            </CustomText>

          {/* The Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
          >
            <Text style={{ color: 'white' }}>OK</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderContent()}
      {renderLoading()}

      {/* Modals */}
      <Modal
        visible={showFileSelectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseFileSelectionModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText variant="medium" style={styles.modalTitle}>Select Source</CustomText>
              <TouchableOpacity onPress={handleCloseFileSelectionModal}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptions}>
              {/* RAW Folder Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleSelectRawFolder}
              >
                <Icon name="folder-outline" size={24} color="#000" style={styles.modalOptionIcon} />
                <CustomText variant="medium" style={styles.modalOptionText}>RAW Folders</CustomText>
              </TouchableOpacity>

              {/* Device Files Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleSelectFromDevice}
              >
                <Icon name="devices" size={24} color="#000" style={styles.modalOptionIcon} />
                <CustomText variant="medium" style={styles.modalOptionText}>Device Files</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRawFolderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseRawFolderModal}
      >
        <SafeAreaView style={[styles.container, styles.rawFoldersContainer]}>
          <View style={styles.rawFoldersHeader}>
            <TouchableOpacity onPress={handleCloseRawFolderModal}>
              <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <CustomText variant="medium" style={styles.rawFoldersTitle}>RAW Folders</CustomText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.rawFoldersList}>
            {rawFolders.map((folder) => (
              <View key={folder.id} style={styles.rawFolderItem}>
                <View style={styles.fileIconContainer}>
                  <Icon name="file-outline" size={24} color="#000" />
                  <CustomText variant="regular" style={styles.fileTypeLabel}>RW</CustomText>
                </View>
                <CustomText variant="regular" style={styles.rawFolderName}>{folder.name}</CustomText>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleSelectFolder(folder.name)}
                >
                  <CustomText variant="medium" style={styles.selectButtonText}>SELECT</CustomText>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    backgroundColor: '#B8B8B8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    justifyContent: 'center',
  },
  fieldText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 10,
  },  
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 25,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center', // Ensures the picker doesn't bleed over border radius
  },

  iconOverlay: {
    position: 'absolute',
    right: 15,
    top: 18, 
  },
  chevron: {
    fontSize: 12,
    color: '#007AFF',
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  picker: {
    textAlign: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1d1a1a',
    height: 50,
    width: '80%',
    color: '#1A1A1A',
  },
  
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  pickercontainer: {
    flex: 1,    
    backgroundColor: COLORS.BACKGROUND,
    width: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    marginLeft: 5,
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    marginRight: 5,
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 20,
  },
  screenTitle: {
    fontSize: 24,
    color: COLORS.TEXT,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontFamily: FONTS.POPPINS_BOLD,
  },

  midText: {
    fontSize: 18,
    color: COLORS.TEXT,
    textAlign: 'center',
    fontFamily: FONTS.POPPINS_BOLD,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  optionsContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  optionCard: {
    width: '80%',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionCardLandscape: {
    width: '45%',
    marginHorizontal: 10,
  },
  optionText: {
    fontSize: 18,
    color: COLORS.TEXT,
    marginTop: 15,
    textAlign: 'center',
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim the background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    // Add a shadow for depth
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  disabledText: {
    color: DISABLED_COLOR,
  },
  saveButton: {
    backgroundColor: '#5c8599',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: FONTS.POPPINS_MEDIUM,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    color: '#000',
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  modalOptions: {
    paddingVertical: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionIcon: {
    marginRight: 15,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  rawFoldersContainer: {
    backgroundColor: '#f5f5f5',
  },
  rawFoldersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  rawFoldersTitle: {
    fontSize: 18,
    color: '#000',
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  rawFoldersList: {
    flex: 1,
    padding: 15,
  },
  rawFolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileIconContainer: {
    position: 'relative',
    marginRight: 15,
  },
  fileTypeLabel: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: '#666',
  },
  rawFolderName: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontFamily: FONTS.POPPINS_REGULAR,
  },
  selectButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  selectButtonText: {
    color: '#5c8599',
    fontSize: 14,
    fontFamily: FONTS.POPPINS_MEDIUM,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: '#093f24', // Red color for 'Stop/Cancel'
    borderRadius: 25,           // Rounded corners
    borderWidth: 1,
    borderColor: 'white',
  },

  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },  
});

export default ProcessImageScreen; 
