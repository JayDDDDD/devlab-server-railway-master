import { Response, Request } from "express";
import { db } from "../../admin/admin";

export const addStage = async (req: Request, res: Response) => {
  const { category, lessonId, levelId } = req.body as {
    category: string;
    lessonId: string;
    levelId: string;
  };
  try {
    const lastOrderRef = await db
      .collection(category)
      .doc(lessonId)
      .collection("Levels")
      .doc(levelId)
      .collection("Stages")
      .orderBy("order", "desc")
      .limit(1)
      .get();

    let newNumber = 1;
    if (!lastOrderRef.empty) {
      const temp = lastOrderRef.docs[0].data();
      newNumber = temp.order + 1;
    }

    const newStageId = `Stage${newNumber}`;

    await db
      .collection(category)
      .doc(lessonId)
      .collection("Levels")
      .doc(levelId)
      .collection("Stages")
      .doc(newStageId)
      .set({
        createdAt: new Date(),
        order: newNumber,
        type: "Lesson",
        isHidden: false,
        title: "A new stage is automatically created",
        description:
          "Customize the title and content to guide learners through the initial steps of this level.",
      });

    return res
      .status(200)
      .json({ message: "A new stage has been sucessfully added" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong whena adding a stage" });
  }
};
