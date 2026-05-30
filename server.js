require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const CloudConvert = require("cloudconvert");
const fs = require("fs");

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

const app = express();

app.use(cors());

const upload = multer({
  dest: "uploads/",
});

app.get("/", (req, res) => {
  res.send("Document Converter API Running");
});

app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const sourceFormat = req.file.originalname.split(".").pop().toLowerCase();

    const targetFormat = req.body.targetFormat;

    console.log("Source:", sourceFormat);
    console.log("Target:", targetFormat);

    // CREATE JOB

    const job = await cloudConvert.jobs.create({
      tasks: {
        importFile: {
          operation: "import/upload",
        },

        convertFile: {
          operation: "convert",
          input: "importFile",
          input_format: sourceFormat,
          output_format: targetFormat,
        },

        exportFile: {
          operation: "export/url",
          input: "convertFile",
        },
      },
    });

    // FIND IMPORT TASK

    const importTask = job.tasks.find((task) => task.name === "importFile");

    // UPLOAD FILE TO CLOUDCONVERT

    await cloudConvert.tasks.upload(
      importTask,
      fs.createReadStream(req.file.path),
      req.file.originalname,
    );

    console.log("File uploaded");

    // WAIT FOR JOB

    const completedJob = await cloudConvert.jobs.wait(job.id);

    console.log("Conversion completed");

    // FIND EXPORT TASK

    const exportTask = completedJob.tasks.find(
      (task) => task.name === "exportFile",
    );

    const file = exportTask.result.files[0];

    console.log("Download URL:", file.url);

    // DOWNLOAD CONVERTED FILE

    const response = await axios.get(file.url, {
      responseType: "arraybuffer",
    });

    // SEND FILE BACK

    res.setHeader("Content-Type", response.headers["content-type"]);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="converted.${targetFormat}"`,
    );

    res.send(response.data);

    // CLEAN UP

    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
