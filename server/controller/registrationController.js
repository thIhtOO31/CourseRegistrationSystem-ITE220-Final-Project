const mongoose = require("mongoose");
const User = require("../models/User");
const Offering = require("../models/Offering");
const Registration = require("../models/Registration");

const { finalisedTerms } = require("../config/term");
const { AppError, asyncHandler } = require("../middleware/error");
const { assertObjectId, assertTerm, assertAllowedFields } = require("../utils/validation");
const { registrationDTO } = require("../utils/dto");
const { getEligibility } = require("../services/eligibilityService");

async function populateRegistrations(ids) {
  const rows = await Registration.find({
    _id: {
      $in: ids
    }
  }).populate(
    {
      path: "offeringId",
      populate: {
        path: "courseId"
      }
    }
  );

  const order = new Map(ids.map((id, index) => [String(id), index]));
  rows.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  return rows;
}

// Check course rules before saving registrations
const createRegistrations = asyncHandler(
  async (req, res) => {
    assertAllowedFields(req.body || {}, ["studentId", "term", "offeringIds"]);
    const {
      studentId,
      term,
      offeringIds
    } = req.body || {};

    assertObjectId(studentId, "student ID");

    assertTerm(term);

    if (finalisedTerms.includes(term)) throw new AppError(409, "Term is finalised");

    if (!Array.isArray(offeringIds) || offeringIds.length === 0) {
      throw new AppError(400, "offeringIds must be a nonempty array");
    }

    offeringIds.forEach(offeringId => assertObjectId(offeringId, "offering ID"));

    if (new Set(offeringIds.map(String)).size !== offeringIds.length) {
      throw new AppError(400, "Duplicate offering IDs are not allowed");
    }

    const session = await mongoose.startSession();
    let savedIds = [];
    try {
      await session.withTransaction(
        async () => {
          savedIds = [];
          const lockedStudent = await User.findOneAndUpdate(
            {
              _id: studentId,
              role: "student",
              active: true
            },
            {
              $inc: {
                writeVersion: 1
              }
            },
            {
              new: true,
              session
            }
          );

          if (!lockedStudent) throw new AppError(404, "Active student not found");

          if (finalisedTerms.includes(term)) throw new AppError(409, "Term is finalised");

          const eligibility = await getEligibility(
            {
              studentId,
              term,
              selectedOfferingIds: offeringIds,
              session
            }
          );

          const byId = new Map(eligibility.sections.map(section => [String(section._id), section]));
          const rejected = offeringIds.map(offeringId => byId.get(String(offeringId))).filter(section => !section || !section.selectable);
          if (rejected.length) {
            const reasons = rejected.map(
              section => section
                ? `${section.courseCode} Section ${section.section}: ${section.reasons.join("; ")}`
                : "Unknown offering"
            );
            throw new AppError(409, "Registration rules rejected the selection", reasons);
          }

          for (const offeringId of offeringIds) {
            const existing = await Registration.findOne({
              studentId,
              offeringId
            }).session(session);

            if (existing && existing.status === "registered") {
              throw new AppError(409, "Student is already registered in a selected offering");
            }

            const reserved = await Offering.findOneAndUpdate(
              {
                _id: offeringId,
                term,
                $expr: {
                  $lt: ["$seatsTaken", "$seats"]
                }
              },
              {
                $inc: {
                  seatsTaken: 1
                }
              },
              {
                new: true,
                session
              }
            );

            if (!reserved) throw new AppError(409, "A selected offering no longer has an available seat");
            let registration;
            if (existing) {
              existing.status = "registered";
              existing.term = term;
              await existing.save({
                session
              });
              registration = existing;
            } else {
              const created = await Registration.create(
                [{
                  studentId,
                  offeringId,
                  term,
                  status: "registered"
                }],
                {
                  session
                }
              );
              registration = created[0];
            }
            savedIds.push(registration._id);
          }
        }
      );
    } finally {
      await session.endSession();
    }

    const rows = await populateRegistrations(savedIds);
    res.status(201).json({
      data: rows.map(registrationDTO)
    });
  }
);

// Drop a registration and free its seat
const dropRegistration = asyncHandler(
  async (req, res) => {
    assertObjectId(req.params.id, "registration ID");
    const initial = await Registration.findById(req.params.id).select("studentId");

    if (!initial) throw new AppError(404, "Registration not found");

    const session = await mongoose.startSession();
    let droppedId;
    try {
      await session.withTransaction(
        async () => {
          const lockedStudent = await User.findOneAndUpdate(
            {
              _id: initial.studentId,
              role: "student"
            },
            {
              $inc: {
                writeVersion: 1
              }
            },
            {
              new: true,
              session
            }
          );

          if (!lockedStudent) throw new AppError(404, "Student not found");
          const registration = await Registration.findById(req.params.id).session(session);
          if (!registration) throw new AppError(404, "Registration not found");
          if (registration.status !== "registered") throw new AppError(409, "Registration is already dropped");
          if (finalisedTerms.includes(registration.term)) throw new AppError(409, "Term is finalised");
          const offering = await Offering.findById(registration.offeringId).session(session);
          if (!offering) throw new AppError(409, "Referenced offering is missing");
          const released = await Offering.findOneAndUpdate(
            {
              _id: offering._id,
              seatsTaken: {
                $gt: 0
              }
            },
            {
              $inc: {
                seatsTaken: -1
              }
            },
            {
              new: true,
              session
            }
          );
          if (!released) throw new AppError(409, "Seat count is already inconsistent");
          registration.status = "dropped";
          await registration.save({
            session
          });
          droppedId = registration._id;
        }
      );
    } finally {
      await session.endSession();
    }
    const row = (await populateRegistrations([droppedId]))[0];
    res.json({
      data: registrationDTO(row)
    });
  }
);

module.exports = { createRegistrations, dropRegistration };