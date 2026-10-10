const mongoose = require("mongoose");

const Course = require("../models/Course");
const Offering = require("../models/Offering");
const Registration = require("../models/Registration");

const {finalisedTerms} = require("../config/term");
const {AppError, asyncHandler} = require("../middleware/error");
const {assertObjectId, assertTerm, assertAllowedFields} = require("../utils/validation");
const {courseDTO, offeringDTO} = require("../utils/dto");

const BASE_FIELDS = [
  "courseId",
  "term",
  "section",
  "day",
  "startTime",
  "endTime",
  "room",
  "instructor",
  "seats",
  "instructorEmail"
];

const PATCH_FIELDS = [...BASE_FIELDS, "addDropOpen", "addDropClosesAt"];

// Check that the course exists
async function ensureCourse(courseId, session = null) {
  assertObjectId(courseId, "course ID");

  const query = Course.findById(courseId);
  const course = session ? await query.session(session) : await query;

  if (!course) throw new AppError(404, "Course not found");
  return course;
}

function same(a, b) {
  return String(a ?? "") === String(b ?? "");
}

// Return the list of courses
const listCourses = asyncHandler(
  async (req, res) => {
    const courses = await Course.find().sort({
      code: 1
    });
    res.json({
      data: courses.map(courseDTO)
    });
  }
);

// Return course sections for a term
const listOfferings = asyncHandler(
  async (req, res) => {
    const {term} = req.query;

    if (!term) throw new AppError(400, "term is required");

    assertTerm(term);
    const offerings = await Offering.find({
      term
    }).populate("courseId");
    offerings.sort(
      (a, b) => {
        const code = a.courseId.code.localeCompare(b.courseId.code);
        return code || a.section - b.section;
      }
    );

    res.json({data: offerings.map(offeringDTO)});
  }
);

// Create a course section for students
const createOffering = asyncHandler(
  async (req, res) => {
    assertAllowedFields(req.body || {}, BASE_FIELDS);

    for (const key of BASE_FIELDS) {
      if (key !== "instructorEmail" && (req.body[key] === undefined || req.body[key] === ""))
        throw new AppError(400, `${key} is required`);
    }

    assertTerm(req.body.term);

    if (finalisedTerms.includes(req.body.term)) throw new AppError(409, "Term is finalised");

    await ensureCourse(req.body.courseId);

    const offering = await Offering.create({
      ...req.body,
      addDropOpen: false,
      addDropClosesAt: null,
      seatsTaken: 0
    });

    await offering.populate("courseId");

    res.status(201).json({data: offeringDTO(offering)});
  }
);

// Update section details and validate changes
const updateOffering = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "offering ID");

    assertAllowedFields(req.body || {}, PATCH_FIELDS);

    if (!Object.keys(req.body || {}).length) throw new AppError(400, "No fields to update");

    const session = await mongoose.startSession();

    let offeringId;

    try {
      await session.withTransaction(
        async () => {
          const offering = await Offering.findById(req.params.id).session(session);

          if (!offering) throw new AppError(404, "Offering not found");

          if (finalisedTerms.includes(offering.term)) throw new AppError(409, "Term is finalised");

          const hasHistory = await Registration.exists({offeringId: offering._id}).session(session);
          const hasActive = await Registration.exists({offeringId: offering._id, status: "registered"}).session(session);

          const proposedCourseId = req.body.courseId !== undefined ? req.body.courseId : offering.courseId;
          const proposedTerm = req.body.term !== undefined ? req.body.term : offering.term;
          const proposedSection = req.body.section !== undefined ? req.body.section : offering.section;
          const proposedDay = req.body.day !== undefined ? req.body.day : offering.day;
          const proposedStart = req.body.startTime !== undefined ? req.body.startTime : offering.startTime;
          const proposedEnd = req.body.endTime !== undefined ? req.body.endTime : offering.endTime;
          const proposedSeats = req.body.seats !== undefined ? req.body.seats : offering.seats;
          const proposedOpen = req.body.addDropOpen !== undefined ? req.body.addDropOpen : offering.addDropOpen;
          const proposedCloses = req.body.addDropClosesAt !== undefined ? req.body.addDropClosesAt : offering.addDropClosesAt;

          assertTerm(String(proposedTerm));

          if (finalisedTerms.includes(String(proposedTerm))) throw new AppError(409, "Term is finalised");

          await ensureCourse(proposedCourseId, session);

          if (hasHistory &&
            (!same(proposedCourseId, offering.courseId) || !same(proposedTerm, offering.term) ||
              Number(proposedSection) !== Number(offering.section))) {
            throw new AppError(409, "Course, term and section cannot change after registration history exists");
          }

          if (hasActive &&
            (!same(proposedDay, offering.day) || !same(proposedStart, offering.startTime) ||
              !same(proposedEnd, offering.endTime))) {
            throw new AppError(409, "Day and time cannot change while students are registered");
          }

          if (!Number.isInteger(Number(proposedSeats)) || Number(proposedSeats) < 0) {
            throw new AppError(400, "seats must be a nonnegative integer");
          }

          if (Number(proposedSeats) < offering.seatsTaken) {
            throw new AppError(409, "Capacity cannot be lower than seats already taken");
          }

          if (typeof proposedOpen !== "boolean") throw new AppError(400, "addDropOpen must be true or false");

          if (proposedOpen) {
            const closeDate = new Date(proposedCloses);
            if (!proposedCloses || Number.isNaN(closeDate.getTime()) || closeDate.getTime() <= Date.now()) {
              throw new AppError(400, "Opening add/drop requires a future closing date/time");
            }
          } else if (proposedCloses && Number.isNaN(new Date(proposedCloses).getTime())) {
            throw new AppError(400, "Invalid addDropClosesAt date/time");
          }

          for (const [key, value] of Object.entries(req.body)) offering[key] = value;

          await offering.save({
            session
          });

          offeringId = offering._id;
        }
      );
    } finally {
      await session.endSession();
    }
    const saved = await Offering.findById(offeringId).populate("courseId");

    res.json({data: offeringDTO(saved)});
  }
);

// Delete a section without registration history
const deleteOffering = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "offering ID");
    const session = await mongoose.startSession();
    let deletedId;

    try {
      await session.withTransaction(
        async () => {
          const offering = await Offering.findById(req.params.id).session(session);

          if (!offering) throw new AppError(404, "Offering not found");
          if (finalisedTerms.includes(offering.term)) throw new AppError(409, "Term is finalised");

          const hasHistory = await Registration.exists({offeringId: offering._id}).session(session);

          if (hasHistory) throw new AppError(409, "Offering cannot be removed because registration history exists");

          deletedId = String(offering._id);
          await Offering.deleteOne({_id: offering._id}).session(session);
        }
      );
    } finally {
      await session.endSession();
    }

    res.json({
      data: {
        _id: deletedId,
        message: "Offering deleted"
      }
    });
  }
);

module.exports = {
  listCourses,
  listOfferings,
  createOffering,
  updateOffering,
  deleteOffering
};