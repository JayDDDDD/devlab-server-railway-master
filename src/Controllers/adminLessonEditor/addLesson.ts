import { db } from "../../admin/admin";
import { Request, Response } from "express";

export const addLesson = async (req: Request, res: Response) => {
  const { category, lessonTitle, levelTitle }: 
    { category: string; lessonTitle: string; levelTitle: string } = req.body;

  // Validate required fields
  if (!category || !lessonTitle || !levelTitle) {
    return res.status(400).json({
      message: "Category, Lesson Title, and Level Title are required.",
    });
  }

  try {
    // Fetch existing lessons to determine next lesson number
    const lessonData = (await db.collection(category).get()).docs;

    const lessonNumbers = lessonData.map((item) => {
      const match = item.id.match(/Lesson(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    const nextNumber =
      (lessonNumbers.length > 0 ? Math.max(...lessonNumbers) : 0) + 1;

    const newLessonId = `Lesson${nextNumber}`;
    const batch = db.batch();

    // Create main Lesson document
    batch.set(db.collection(category).doc(newLessonId), {
      Lesson: nextNumber,
      title: lessonTitle, // <-- Use lessonTitle from frontend
      createdAt: new Date(),
    });

    // Create Level1 template with Level Title from frontend
    batch.set(
      db.collection(category).doc(newLessonId).collection("Levels").doc("Level1"),
      {
        lesson: 1,
        description: "This is a newly added level, feel free to edit this!",
        title: levelTitle, // <-- Use levelTitle from frontend
        expReward: 1,
        coinsReward: 1,
        levelOrder: 1,
        createdAt: new Date(),
      }
    );

    // Create Stage1 template inside Level1
    batch.set(
      db
        .collection(category)
        .doc(newLessonId)
        .collection("Levels")
        .doc("Level1")
        .collection("Stages")
        .doc("Stage1"),
      {
        createdAt: new Date(),
        order: 1,
        type: "Lesson",
        isHidden: false,
        title: "A new stage is automatically created",
        description:
          "Customize the title and content to guide learners through the initial steps of this level.",
      }
    );

    await batch.commit();

    return res.status(200).json({
      message: `Lesson ${nextNumber} has been added successfully!`,
      lessonId: newLessonId,
    });
  } catch (error) {
    console.error("addLesson ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
