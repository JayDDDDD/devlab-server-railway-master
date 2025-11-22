import { Request, Response } from "express";
import { bucket, db } from "../../admin/admin";

export const addNEWLevel = async (req: Request, res: Response) => {
  let {
    category,
    lessonState,
    lessonId,
  }: {
    category: string;
    lessonId: string;
    lessonState: {
      title: string;
      description: string;
      coinsReward: number;
      expReward: number;
    };
  } = req.body;
  if (typeof lessonState === "string") {
    lessonState = JSON.parse(lessonState);
  }

  let stageState =
    typeof req.body.stageState === "string"
      ? JSON.parse(req.body.stageState)
      : req.body.stageState;
  const uploadedFiles = req.files as Express.Multer.File[];

  try {
    const lessonsData = (
      await db.collection(category).doc(lessonId).collection("Levels").get()
    ).docs;

    const newLevelNumber = lessonsData.map((item) => {
      const match = item.id.match(/Level(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    // gets the next number
    const nextNumber =
      (newLevelNumber!.length > 0 ? Math.max(...newLevelNumber!) : 0) + 1;

    const newLevelid = `Level${nextNumber}`;

    const batch = db.batch();

    const newLevelRef = db
      .collection(category)
      .doc(lessonId)
      .collection("Levels")
      .doc(newLevelid);

    //   handle creation of new level
    batch.set(newLevelRef, {
      title: lessonState.title,
      description: lessonState.description,
      expReward: lessonState.expReward,
      coinsReward: lessonState.coinsReward,
      levelOrder: nextNumber,
      createdAt: new Date(),
    });
    if (uploadedFiles && uploadedFiles.length > 0) {
      const uploadPromise = uploadedFiles.map(async (file) => {
        const fileName = `${Date.now()}_${file.originalname}`;
        const filePath = `stageFiles/${category}/${lessonId}/${newLevelid}/Stage1/${fileName}`;
        const fileRef = bucket.file(filePath);
        await fileRef.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
          public: true,
          resumable: true,
        });
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        return {
          fieldName: file.fieldname, // This is the key from formData, e.g., "image_abc123"
          url: publicUrl,
        };
      });
      const uploadedUrls = await Promise.all(uploadPromise);
      if (stageState.blocks) {
        stageState.blocks = stageState.blocks.map((block: any) => {
          if (block.type === "Image" && block.value) {
            const matchingUpload = uploadedUrls.find(
              (u) => u.fieldName === `image_${block.id}`
            );
            if (matchingUpload) {
              return { ...block, value: matchingUpload.url };
            }
          }
          return block;
        });
      }
    }
    const stageRef = db
      .collection(category)
      .doc(lessonId)
      .collection("Levels")
      .doc(newLevelid)
      .collection("Stages")
      .doc("Stage1");

    batch.set(stageRef, {
      title: stageState.title,
      blocks: stageState.blocks,
      description: stageState.description,
      instruction: stageState.instruction,
      codingInterface: stageState.codingInterface,
      isHidden: false,
      type: "Lesson",
      createdAt: new Date(),
      order: 1,
    });
    await batch.commit();
    return res.status(200).json({
      message: `BOMBAYUH`,
      newLevelId: newLevelid,
    });
  } catch (error) {
    console.error("🔥 addNEWLesson ERROR:", error);
    return res.status(500).json({ message: "Failed to edit stage", error });
  }
};
