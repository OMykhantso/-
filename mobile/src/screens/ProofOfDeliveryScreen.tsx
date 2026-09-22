import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ActionButton from "../components/ActionButton";
import SignaturePad, { SignaturePadHandle } from "../components/SignaturePad";
import * as deliveriesApi from "../api/deliveries";
import { useAuth } from "../context/AuthContext";
import { useDeliveries } from "../context/DeliveryContext";
import { Coords, getCurrentCoords } from "../services/location";

export default function ProofOfDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refetch } = useDeliveries();
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshLocation();
  }, []);

  const refreshLocation = async () => {
    setLocating(true);
    const result = await getCurrentCoords();
    setCoords(result);
    setLocating(false);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Camera permission needed", "Allow camera access to take a delivery photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.5,
    });
    applyImageResult(result);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Photo library permission needed", "Allow photo access to attach a delivery photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.5,
    });
    applyImageResult(result);
  };

  const applyImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
  };

  const onSubmit = async () => {
    if (!token || !id) return;
    if (!photoBase64) {
      setError("Attach a photo before submitting.");
      return;
    }
    if (signaturePadRef.current?.isEmpty() ?? true) {
      setError("Capture a signature before submitting.");
      return;
    }
    if (!coords) {
      setError("Waiting for your location — try refreshing it.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const signatureBase64 = await signaturePadRef.current!.capture();
      await deliveriesApi.submitProofOfDelivery(token, id, {
        photoBase64,
        signatureBase64,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim() || undefined,
      });
      await refetch();
      Alert.alert("Delivered", "Proof of delivery submitted successfully.", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit proof of delivery.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Photo</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.half}>
          <ActionButton label="Take Photo" onPress={pickFromCamera} variant="secondary" />
        </View>
        <View style={styles.half}>
          <ActionButton label="Choose Photo" onPress={pickFromLibrary} variant="outline" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Signature</Text>
      <SignaturePad
        ref={signaturePadRef}
        height={180}
      />
      <View style={styles.signatureButtons}>
        <ActionButton
          label="Clear Signature"
          variant="outline"
          onPress={() => signaturePadRef.current?.clear()}
        />
      </View>

      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.locationBox}>
        {locating ? (
          <Text style={styles.placeholderText}>Getting current location…</Text>
        ) : coords ? (
          <Text style={styles.locationText}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.placeholderText}>Location unavailable</Text>
        )}
        <ActionButton label="Refresh" variant="outline" onPress={refreshLocation} />
      </View>

      <Text style={styles.sectionTitle}>Note (optional)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Left with front desk, etc."
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.submitWrapper}>
        <ActionButton label="Submit Proof of Delivery" onPress={onSubmit} loading={submitting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  photoPreview: { width: "100%", height: 200, borderRadius: 12, backgroundColor: "#E5E7EB" },
  photoPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#9CA3AF", fontSize: 13 },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  half: { flex: 1 },
  signatureButtons: { marginTop: 10, alignItems: "flex-start", width: 160 },
  locationBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationText: { fontSize: 14, color: "#111827", fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  error: { color: "#DC2626", fontSize: 13, marginTop: 16 },
  submitWrapper: { marginTop: 24 },
});
