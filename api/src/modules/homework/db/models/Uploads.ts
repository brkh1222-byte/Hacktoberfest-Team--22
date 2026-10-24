import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import { fail } from "../../errors.ts";
import { type IUploadDocument, uploadSchema } from "../definitions/homework.ts";

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const isPdf = (data: Buffer) =>
  data.length > 5 && data.length <= MAX_PDF_BYTES && data.subarray(0, 5).toString("latin1") === "%PDF-";

export interface IUploadModel extends Model<IUploadDocument> {
  createPdf(ownerId: string, filename: string, data: Buffer): Promise<string>;
  readPdf(ownerId: string, _id: string): Promise<Buffer>;
}

export const loadUploadClass = (models: IModels) => {
  class Upload {
    public static async createPdf(ownerId: string, filename: string, data: Buffer) {
      if (!isPdf(data)) fail("BAD_USER_INPUT", "Upload a PDF file of 10 MB or less");

      const upload = await models.Uploads.create({
        ownerId,
        filename: filename.slice(0, 200) || "lesson.pdf",
        size: data.length,
        data,
      });

      return upload._id;
    }

    // Owner-only: an upload id from another teacher reads as missing.
    public static async readPdf(ownerId: string, _id: string) {
      // Not lean: the hydrated document turns the stored Binary back into a Buffer.
      const upload = await models.Uploads.findOne({ _id, ownerId });

      if (!upload) {
        return fail("NOT_FOUND", "The uploaded PDF has expired or was not found; upload it again");
      }

      return upload.data;
    }
  }

  uploadSchema.loadClass(Upload);

  return uploadSchema;
};
