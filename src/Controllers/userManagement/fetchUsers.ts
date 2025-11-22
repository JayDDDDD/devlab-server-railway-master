import { Response, Request } from "express";
import { auth, db } from "../../admin/admin";

type userDataProps = {
  username: string;
  email: string;
  userLevel: number;
  isSuspended: boolean;
  isAdmin: boolean;
  profileImage: string;
};

export const fetchUsers = async (req: Request, res: Response) => {
  try {
    const userRef = db.collection("Users");
    const userSnapShot = await userRef.get();

    const subjectTemp = ["Html", "Css", "JavaScript", "Database"];

    const userDataTemp = await Promise.all(
      userSnapShot.docs.map(async (snap) => {
        const userId = snap.id;

        // Fetch user info and auth info in parallel
        const userInfoPromise = snap.data() as userDataProps;
        const authPromise = auth.getUser(userId);

        const [userInfo, authUser] = await Promise.all([
          userInfoPromise,
          authPromise,
        ]);
        const isAccountSuspended = authUser.disabled;

        // Fetch level counts in parallel per subject
        const levelCountEntries = await Promise.all(
          subjectTemp.map(async (subjectLoop) => {
            const lessonsSnap = await userRef
              .doc(userId)
              .collection("Progress")
              .doc(subjectLoop)
              .collection("Lessons")
              .get();

            const userSubjectLevelCount = await Promise.all(
              lessonsSnap.docs.map(async (lessonDoc) => {
                const levelSnap = await userRef
                  .doc(userId)
                  .collection("Progress")
                  .doc(subjectLoop)
                  .collection("Lessons")
                  .doc(lessonDoc.id)
                  .collection("Levels")
                  .where("isCompleted", "==", true)
                  .get();
                return levelSnap.size;
              })
            );

            const totalLevels = userSubjectLevelCount.reduce(
              (a, b) => a + b,
              0
            );
            return [subjectLoop, totalLevels] as const;
          })
        );

        const levelCount = Object.fromEntries(levelCountEntries);

        // Fetch achievements
        const achievementsSnap = await userRef
          .doc(userId)
          .collection("Achievements")
          .get();

        const groupedAchievements: Record<
          "Html" | "Css" | "JavaScript" | "Database",
          { quantity: number }
        > = {
          Html: { quantity: 0 },
          Css: { quantity: 0 },
          JavaScript: { quantity: 0 },
          Database: { quantity: 0 },
        };

        achievementsSnap.docs.forEach((doc) => {
          if (doc.id.startsWith("Html_"))
            groupedAchievements.Html.quantity += 1;
          else if (doc.id.startsWith("Css_"))
            groupedAchievements.Css.quantity += 1;
          else if (doc.id.startsWith("Js_"))
            groupedAchievements.JavaScript.quantity += 1;
          else if (doc.id.startsWith("Db_"))
            groupedAchievements.Database.quantity += 1;
        });

        return {
          id: userId,
          ...userInfo,
          isAccountSuspended,
          levelCount,
          achievements: groupedAchievements,
        };
      })
    );

    res.status(200).json(userDataTemp);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong when fetching users" });
  }
};

// export const fetchUsers = async (req: Request, res: Response) => {
//   try {
//     const userRef = db.collection("Users");
//     const userSnapShot = await userRef.get();

//     const userDataTemp: any[] = [];
//     const subjectTemp = ["Html", "Css", "JavaScript", "Database"];

//     for (const snap of userSnapShot.docs) {
//       const userId = snap.id;
//       const isAccountSuspended = (await auth.getUser(userId)).disabled;

//       const userInfo = snap.data() as userDataProps;

//       const levelCount: Record<string, number> = {};

//       for (const subjectLoop of subjectTemp) {
//         const lessonRef = await userRef
//           .doc(userId)
//           .collection("Progress")
//           .doc(subjectLoop)
//           .collection("Lessons")
//           .get();

//         let userSubjectLevelCount = 0;
//         for (const lessonTemp of lessonRef.docs) {
//           const lessonId = lessonTemp.id;

//           const levelRef = await userRef
//             .doc(userId)
//             .collection("Progress")
//             .doc(subjectLoop)
//             .collection("Lessons")
//             .doc(lessonId)
//             .collection("Levels")
//             .where("isCompleted", "==", true)
//             .get();

//           userSubjectLevelCount += levelRef.size;
//         }

//         levelCount[subjectLoop] = userSubjectLevelCount;
//       }

//       const groupedAchievements: Record<
//         "Html" | "Css" | "JavaScript" | "Database",
//         { quantity: number }
//       > = {
//         Html: {
//           quantity: 0,
//         },
//         Css: {
//           quantity: 0,
//         },
//         JavaScript: {
//           quantity: 0,
//         },
//         Database: {
//           quantity: 0,
//         },
//       };
//       const userAchievements = userRef.doc(userId).collection("Achievements");
//       const achievementsSnap = await userAchievements.get();
//       achievementsSnap.docs.forEach((doc) => {
//         if (doc.id.startsWith("Html_")) groupedAchievements.Html.quantity += 1;
//         else if (doc.id.startsWith("Css_"))
//           groupedAchievements.Css.quantity += 1;
//         else if (doc.id.startsWith("Js_"))
//           groupedAchievements.JavaScript.quantity += 1;
//         else if (doc.id.startsWith("Db_"))
//           groupedAchievements.Database.quantity += 1;
//       });

//       userDataTemp.push({
//         id: userId,
//         ...userInfo,
//         isAccountSuspended: isAccountSuspended,
//         levelCount,
//         achievements: groupedAchievements,
//       });
//     }

//     console.log(userDataTemp);
//     res.status(200).json(userDataTemp);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Something went wrong when fetching users" });
//   }
// };
