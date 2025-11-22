import { Request, Response } from "express";
import { bucket, db } from "../../admin/admin";

export const addNEWStage = async (req: Request, res: Response) => {
  let {
    category,
    lessonId,
    levelId,
  }: {
    category: string;
    lessonId: string;
    levelId: string;
  } = req.body;

  let stageState =
    typeof req.body.stageState === "string"
      ? JSON.parse(req.body.stageState)
      : req.body.stageState;
  const uploadedFiles = req.files as Express.Multer.File[];

  try {
    // Get the last stage by order
    const lastOrderRef = await db
      .collection(category)
      .doc(lessonId)
      .collection("Levels")
      .doc(levelId)
      .collection("Stages")
      .orderBy("order", "desc")
      .limit(1)
      .get();

    // Determine the next stage number
    let newNumber = 1;
    if (!lastOrderRef.empty) {
      const lastStageData = lastOrderRef.docs[0].data();
      newNumber = lastStageData.order + 1;
    }

    const newStageId = `Stage${newNumber}`;

    const batch = db.batch();

    if (uploadedFiles && uploadedFiles.length > 0) {
      const uploadPromise = uploadedFiles.map(async (file) => {
        const fileName = `${Date.now()}_${file.originalname}`;
        const filePath = `stageFiles/${category}/${lessonId}/${levelId}/${newStageId}/${fileName}`;
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
          fieldName: file.fieldname,
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
      .doc(levelId)
      .collection("Stages")
      .doc(newStageId);

    const dataToSave: any = {
      title: stageState.title,
      description: stageState.description,
      instruction: stageState.instruction,
      type: stageState.type,
      order: newNumber,
      createdAt: new Date(),
      isHidden: stageState.isHidden ?? false,
    };

    // Add gamemode-specific fields
    if (stageState.type === "BrainBytes") {
      dataToSave.choices = stageState.choices;
    } else {
      // Only include codingInterface for types other than BrainBytes
      dataToSave.codingInterface = stageState.codingInterface ?? {};
    }

    if (stageState.type === "CodeRush") {
      dataToSave.timer = stageState.timer;
    }
    if (stageState.type === "Lesson") {
      dataToSave.blocks = stageState.blocks ?? [];
    }

    batch.set(stageRef, dataToSave);

    await batch.commit();
    return res.status(200).json({
      message: `BOMBAYUH`,
      newStageId: newStageId,
    });
  } catch (error) {
    console.error("🔥 addNEWLesson ERROR:", error);
    return res.status(500).json({ message: "Failed to edit stage", error });
  }
};
