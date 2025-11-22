import { auth } from "./src/admin/admin";

export const setAdmin = async (email: string) => {
  try {
    const makeAdmin = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(makeAdmin.uid, {
      role: "admin",
    });
    console.log("admin set succesfully!");
  } catch (error) {
    console.error("❌ Error setting admin:", error);
  }
};

setAdmin("laincaputol@gmail.com");
