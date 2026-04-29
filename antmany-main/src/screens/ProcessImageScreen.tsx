import React, { useState, useEffect } from 'react';
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

type ProcessImageScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProcessImage'>;
  route: RouteProp<RootStackParamList, 'ProcessImage'>;
};

// Define a fallback color for disabled state
const DISABLED_COLOR = '#cccccc';

const ProcessImageScreen: React.FC<ProcessImageScreenProps> = ({ navigation, route }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFileSelectionModal, setShowFileSelectionModal] = useState(false);
  const [showRawFolderModal, setShowRawFolderModal] = useState(false);
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width > Dimensions.get('window').height ? 'landscape' : 'portrait'
  );
  
  // New state variables for the two images
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const cameraRef = React.useRef<Camera>(null);
  const [manuchoice, setManuChoice] = useState("CUSTOM");//<AntigenManufacturer>("DEFAULT"); 
  
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

  // Modified to use the ScannerScreen approach for processing
  const processImageResult = async (uri: string) => {
    try {
      setIsProcessing(true);
      console.log('Processing image:', uri);
      Alert.alert(
        'Processing...',
        'Please wait...',
        [{ text: 'OK' }]);
      // Use the public processFiles method with the required parameters
      const scanResult = await scannerService.processFile2(uri, true);

    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(
        'Error',
        'Failed to process the image. Please try again.' + ' error '+ error,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };


const MAX_NB_RETRY = 100;
const RETRY_DELAY_MS = 100;

function sleep(delay: number){
    return new Promise((resolve) => setTimeout(resolve, delay));
}

async function fetchRetry(input: RequestInfo | URL, init?: RequestInit) {
    let retryLeft = MAX_NB_RETRY;

    let response = await fetch(input, init);

    if (response.ok) 
    {
      return response;
    }    

    while (retryLeft > 0){
        try {
            //return await fetch(input, init);
            const response = await fetch(input, init);

            if (response.ok || (retryLeft <= 1)) 
            {
              return response;
            }
        }
        catch (err) { 
            for (let i = 0; i <= 50;) {
              i++;
            }

            //await sleep(RETRY_DELAY_MS)
        }
        finally {
            for (let i = 0; i <= 100;) {
              i++;
            }

            retryLeft -= 1;
        }
    }

    //if (response.ok || (retryLeft <= 1)) 
    {
      return response;
    }
    //throw new Error(`Too many retries`);
}

  async function downloadTextractOutput(fileKey: string) {
  try {
    //console.log('Requesting download URL for:', fileKey);
    var urlRetry = false; 
    let retryCnt = 0;

    //do 
    //{
//    const response = await fetch(API_ENDPOINT, {

    const response = await fetchRetry(API_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ fileKey: fileKey })
    });
    
    if (!response.ok) {
      if (retryCnt < 1) {
        urlRetry = true;
        retryCnt = retryCnt + 1;
        //simpDelay(400);
      }
      else {
        urlRetry = false;
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }
    }
    else {
      urlRetry = false;
      //break;

    }
    //} //while (urlRetry === true);
  
    const data = await response.json();
    const { downloadUrl } = data;
    
    console.log('Presigned URL received');

    const fileResponse = await fetch(downloadUrl);
    
    if (!fileResponse.ok) {
                     Alert.alert(
              'Error',
              'Download failed. ' + fileResponse.statusText,
              [{ text: 'OK' }]);
      
        throw new Error(`Download failed: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const textractOutput = await fileResponse.text();

    const textractOutputCsv = textractOutput;// getTableCsvResults(textractOutput);

    const path = '/sdcard/Download/textract.json';

    //const path = `${RNFS.DocumentDirectoryPath}/textract.txt`;


// Alert.alert(
//               'Error',
//               'get text ok. ' + fileResponse.statusText,
//               [{ text: 'OK' }]);

    try {

        await RNFS.writeFile(path, textractOutputCsv, 'utf8');
    } catch (error) 
    {
        Alert.alert(
                  'Error',
                  'Download done' + path + ' size '+ textractOutputCsv.length,
                  [{ text: 'OK' }]);

    }

    console.log('Download complete!');
    console.log('File size orig json:', textractOutput.length, 'characters');
    console.log('File size json:', textractOutputCsv.length, 'characters');
    //  Alert.alert(
    //           'Error',
    //           'Download complete. ' + path + ' size '+ textractOutputCsv.length,
    //           [{ text: 'OK' }]);
    return textractOutputCsv;
    
  } catch (error) {
    console.error('Download failed:', error);
        Alert.alert(
                  'Error',
                  'Download failed timed out fetch url ' + JSON.stringify(error),
                  [{ text: 'OK' }]);    
    throw error;
  }
}


  const handleSelectFile2 = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
        includeBase64: false,
      });

      let base64ImageString : string = 'base64string';
      // Usage example
      // const payload = JSON.stringify({ data: "SecureData" });
      // const encrypted = encrypt(payload);
      // console.log(encrypted);
      
      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Image selection failed');
      }

      if (result.assets && result.assets[0]?.uri) {
        // Process the selected image directly     
      } else {
        throw new Error('No image selected');
      }      

      
      // const base64 = await ReactNativeBlobUtil.fs.readFile(result.assets[0].uri, 'base64');
      const localuri = result.assets[0].uri;//Buffer.from(base64).toString('base64');

      const file = {
        uri: localuri,
        name: `pix-${Date.now()}` + result.assets[0].fileName, // Provide a name for the file in S3
        type: result.assets[0].type, // || 'image/jpeg',
      };

      const options = {
      keyPrefix : '',
      bucket: '',
      region: 'us-west-2', // Ex. ap-south-1
      accessKey: '',
      secretKey: '',
      successActionStatus: 201,
      };

      try {
        try{
        const s3Response = await RNS3.put(file, options);

        if (s3Response.status == 201) {
          console.log('Image uploaded successfully to S3:', s3Response);
        } else {
          console.error('Failed to upload image to S3:', s3Response.status);
        Alert.alert(
        'Error',
        'RNS3 Upload Failed. ' + result.assets[0].uri + file.name + s3Response.status,
        [{ text: 'OK' }]
        );
        }
        } catch (err) {
          console.error("Error uploading file:", err);
          Alert.alert(
              'Error',
              'S3 RNS3.put Failed. ' + localuri + err,
              [{ text: 'OK' }]
        );
        }

      } catch (error) {
        Alert.alert(
        'Error',
        'S3 Upload Failed. ' + localuri + error,
        [{ text: 'OK' }]
        );
      }
      
      //const s3Client = new S3Client({ region: "us-west-2" });

      const s3Client = new S3Client({region: 'us-west-2',
        credentials: {
            accessKeyId: '',
            secretAccessKey: '',
        },
      });

      try {

        const fileKey = 'resps/txtrakResp.json'; //txtrakResp.txt';
        const output = await downloadTextractOutput(fileKey);

        await processImageResult(output);

      } catch(error) {
          Alert.alert(
          'Error',
          'Download failed. ' + ' error '+ error,
          [{ text: 'OK' }]);
      }

      } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert(
        'Error',
        'Failed to select image from gallery. Please try again.'+ error ,
        [{ text: 'OK' }]
      );
    }

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
        'Failed to select image from gallery. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSelectFolder = (folderName: string) => {
    navigation.navigate('FileListScreen', { folderName: 'Raw Panels' });
    setShowRawFolderModal(false);
  };

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
    <View style={[
      styles.optionsContainer,
      orientation === 'landscape' && styles.optionsContainerLandscape
    ]}>
      <CustomText variant="medium" style={styles.midText}>
      {'\n'}
    </CustomText>  
      </View>    
      <View style={styles.pickercontainer}>
      {/* <View style={[
        styles.optionsContainer,
        orientation === 'landscape' && styles.optionsContainerLandscape
      ]}> */}
        {/* <Text style={styles.fieldText}>Choose a Manufacturer to use as template:</Text>
         */}
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={manuchoice}
            onValueChange={(itemValue) => setManuChoice(itemValue)}
            style={styles.picker}
            dropdownIconColor="#007AFF"
          >
            <Picker.Item label="Select Manufacturer..." value="" />
            
            {ConstAntigens.ANTIGEN_MANUFACTURERS
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
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <CustomText variant="medium" style={styles.loadingText}>
              Processing Image...
            </CustomText>
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
  loadingContent: {
    width: 180,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    color: COLORS.TEXT,
    fontSize: 16,
  },
});

export default ProcessImageScreen; 