const Course = require("../models/Course");

const { AppError, asyncHandler } = require("../middleware/error");
const { assertAllowedFields } = require("../utils/validation");
const { courseDTO } = require("../utils/dto");

// Add a course to the catalog
const createCourse = asyncHandler(
  async (req, res) => {
    const body = req.body || {};

    assertAllowedFields(body, ["code", "title", "credits", "description"]);

    if (typeof body.code !== "string" || !/^[A-Z][A-Z0-9-]{2,14}$/i.test(body.code.trim())) {
      throw new AppError(400, "A valid course code is required (e.g. CSC350)");
    }

    if (typeof body.title !== "string" || !body.title.trim()) throw new AppError(400, "Course title is required");

    if (!Number.isInteger(body.credits) || body.credits < 1)
      throw new AppError(400, "Credits must be a positive integer");

    if (body.description !== undefined && typeof body.description !== "string") {
      throw new AppError(400, "Description must be text");
    }

    const code = body.code.trim().toUpperCase();

    if (await Course.exists({
      code
    })) throw new AppError(409, "Course code already exists");

    const course = await Course.create(
      {
        code,
        title: body.title.trim(),
        credits: body.credits,
        description: body.description?.trim() || ""
      }
    );

    res.status(201).json({
      data: courseDTO(course)
    });
  }
);
module.exports = {createCourse};