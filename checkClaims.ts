import { auth } from "./src/admin/admin";

const checkClaims = async (email: string) => {
  const user = await auth.getUserByEmail(email);
  console.log("claims:" + JSON.stringify(user.customClaims));
};

checkClaims("laincaputol@gmail.com");
