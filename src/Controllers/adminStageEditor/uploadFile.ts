import { Request, Response } from "express";
import { bucket, db } from "../../admin/admin";

export const uploadFile = async (req: Request, res: Response) => {
  const { category, lessonId, levelId, stageId } = req.body as {
    category: string;
    lessonId: string;
    levelId: string;
    stageId: string;
  };

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const stageRef = db
    .collection(category)
    .doc(lessonId)
    .collection("Levels")
    .doc(levelId)
    .collection("Stages")
    .doc(stageId);

  const destination = `stageFiles/${category}/${lessonId}/${levelId}/${stageId}/replicationFile${stageId}.html`;
  const file = bucket.file(destination);

  try {
    // Attempt to save the file to Firebase Storage
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype, // Use the actual mimetype from the uploaded file
      },
      resumable: true,
    });
    console.log("File saved successfully to Firebase Storage");

    // Only proceed if save succeeded: generate signed URL and update Firestore
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: new Date("2030-03-01T00:00:00Z"),
    });

    await stageRef.set(
      {
        replicationFile: signedUrl,
      },
      {
        merge: true,
      }
    );

    return res.status(200).json({
      message: "File has been successfully added",
      url: signedUrl,
      path: destination,
    });
  } catch (error) {
    console.error("Error uploading file:", error);

    return res.status(500).json({ error: "Failed to upload file to Storage." });
  }
};
