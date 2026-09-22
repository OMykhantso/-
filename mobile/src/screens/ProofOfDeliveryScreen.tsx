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
      Alert.alert("Потрібен доступ до камери", "Дозвольте доступ до камери, щоб зробити фото доставки.");
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
      Alert.alert("Потрібен доступ до фотобібліотеки", "Дозвольте доступ до фото, щоб додати фото доставки.");
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
      setError("Додайте фото перед підтвердженням.");
      return;
    }
    if (signaturePadRef.current?.isEmpty() ?? true) {
      setError("Отримайте підпис перед підтвердженням.");
      return;
    }
    if (!coords) {
      setError("Очікуємо на визначення геолокації — спробуйте оновити.");
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
      Alert.alert("Доставлено", "Підтвердження доставки успішно надіслано.", [
        { text: "Гаразд", onPress: () => router.replace("/home") },
      ]);
    } catch (err) {
      setError(err instanceof Error ? `Помилка: ${err.message}` : "Не вдалося підтвердити доставку.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Фото</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderText}>Фото ще немає</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.half}>
          <ActionButton label="Зробити фото" onPress={pickFromCamera} variant="secondary" />
        </View>
        <View style={styles.half}>
          <ActionButton label="Обрати фото" onPress={pickFromLibrary} variant="outline" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Підпис</Text>
      <SignaturePad
        ref={signaturePadRef}
        height={180}
      />
      <View style={styles.signatureButtons}>
        <ActionButton
          label="Очистити підпис"
          variant="outline"
          onPress={() => signaturePadRef.current?.clear()}
        />
      </View>

      <Text style={styles.sectionTitle}>Місцезнаходження</Text>
      <View style={styles.locationBox}>
        {locating ? (
          <Text style={styles.placeholderText}>Визначаємо місцезнаходження…</Text>
        ) : coords ? (
          <Text style={styles.locationText}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.placeholderText}>Місцезнаходження недоступне</Text>
        )}
        <ActionButton label="Оновити" variant="outline" onPress={refreshLocation} />
      </View>

      <Text style={styles.sectionTitle}>Примітка (необов'язково)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Залишено на рецепції тощо"
        placeholderTextColor="#94A3B8"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.submitWrapper}>
        <ActionButton label="Підтвердити доставку" onPress={onSubmit} loading={submitting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  photoPreview: { width: "100%", height: 200, borderRadius: 16, backgroundColor: "#E2E8F0" },
  photoPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#94A3B8", fontSize: 13 },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  half: { flex: 1 },
  signatureButtons: { marginTop: 12, alignItems: "flex-start", width: 180 },
  locationBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  locationText: { fontSize: 14, color: "#0F172A", fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
  },
  error: { color: "#EF4444", fontSize: 13, marginTop: 16 },
  submitWrapper: { marginTop: 24 },
});
