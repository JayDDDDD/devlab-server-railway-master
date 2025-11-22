import admin, { ServiceAccount } from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT as string
) as ServiceAccount;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "devlab-b8a1e.firebasestorage.app",
});

export const auth = admin.auth();

export const db = admin.firestore();
export const bucket = admin.storage().bucket();
