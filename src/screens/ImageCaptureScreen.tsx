import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { ScannerService } from '../services/scannerService';
import { PanelGrid } from '../components/PanelGrid';
import { PanelData, CellData, ResultValue } from '../types';

type ImageCaptureScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ImageCapture'>;
  route: RouteProp<RootStackParamList, 'ImageCapture'>;
};

const ImageCaptureScreen: React.FC<ImageCaptureScreenProps> = ({ navigation, route }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width > Dimensions.get('window').height ? 'landscape' : 'portrait'
  );
  const [hasPermission, setHasPermission] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>(
    route.params?.imageUri
  );

  const cameraRef = useRef<Camera>(null);
  const scannerService = useRef(new ScannerService()).current;

  const devices = useCameraDevices();
  const device = React.useMemo(() => {
    return devices.find(d => d.position === 'back');
  }, [devices]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.width > window.height ? 'landscape' : 'portrait');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermission(cameraPermission === 'granted');
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    if (route.params?.imageUri) {
      setSelectedImageUri(route.params.imageUri);
    }
  }, [route.params]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const processImageResult = async (uri: string) => {
    try {
      setIsProcessing(true);
      console.log('Processing image:', uri);

      // Use the public processFiles method with the required parameters
      const scanResult = await scannerService.processFile(uri, true);
      console.log('Scan completed, navigating to VerifyPanel');

      // Navigate to the new VerifyPanel screen
      navigation.navigate('VerifyPanel', {
        panelData: scanResult.results // Using the first result
      });
    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert(
        'Error',
        'Failed to process the image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePhoto({
        flash: 'auto'
      });

      console.log('Photo captured at path:', photo.path);

      await processImageResult(photo.path);
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert(
        'Error',
        'Failed to capture image. Please try again.',
        [{ text: 'OK' }]
      );
      setIsProcessing(false);
    }
  };

  const handleSelectImage = async () => {
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

  const renderCamera = () => {
    if (!device) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#336699" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      );
    }

    if (!hasPermission) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission not granted</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const cameraPermission = await Camera.requestCameraPermission();
              setHasPermission(cameraPermission === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraScreenContainer}>
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          <View style={styles.captureFrame}>
            <View style={[styles.cornerMarker, styles.topLeft]} />
            <View style={[styles.cornerMarker, styles.topRight]} />
            <View style={[styles.cornerMarker, styles.bottomLeft]} />
            <View style={[styles.cornerMarker, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCameraCapture}
            disabled={isProcessing}
          >
            <Icon name="camera" size={24} color="#fff" />
            <Text style={styles.captureButtonText}>
              
            </Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleSelectImage}
            disabled={isProcessing}
          >
            <Icon name="image" size={24} color="#fff" />
            <Text style={styles.galleryButtonText}>Gallery</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#336699" />
            <Text style={styles.backText}>Go back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission not granted</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const cameraPermission = await Camera.requestCameraPermission();
              setHasPermission(cameraPermission === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#336699" />
            <Text style={styles.backText}>Go back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#336699" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-left" size={24} color="#336699" />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>

      {renderCamera()}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing image...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#336699',
    fontSize: 16,
    marginLeft: 5,
  },
  cameraScreenContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cameraContainer: {
    flex: 1,
    marginBottom: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  captureFrame: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cornerMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#f5f5f5',
  },
  captureButton: {
    flexDirection: 'row',
    backgroundColor: '#5c8599',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  galleryButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#5c8599',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
});

export default ImageCaptureScreen;