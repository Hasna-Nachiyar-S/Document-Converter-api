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
    const sourceFormat = req.file.originalname.split(".").pop().toLowerCase();

    const targetFormat = req.body.targetFormat;

    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-my-file": {
          operation: "import/upload",
        },
        "convert-my-file": {
          operation: "convert",
          input: "import-my-file",
          input_format: sourceFormat,
          output_format: targetFormat,
        },
        "export-my-file": {
          operation: "export/url",
          input: "convert-my-file",
        },
      },
    });

    console.log("JOB CREATED:");

    console.log(job.id);

    res.json({
      success: true,
      jobId: job.id,
    });
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
