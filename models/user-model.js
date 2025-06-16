import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import RegionMaster from "./region-master-model.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    //one user can have multiple role
    role: {
      type: [String],
      enum: [
        "admin",
        "site_officer",
        "site_pimo",
        "qs_site",
        "pimo_mumbai",
        "director",
        "accounts",
        "viewer",
      ],
      default: ["viewer"],
    },
    //removed from everywhere keeping here, so that somewhere doesnt stop working
    department: {
      type: [String],
      enum: ["Site", "PIMO", "QS", "IT", "Accounts", "Management", "Admin"],
      required: true,
    },
    //one user can have multiple region
    region: {
      type: [String],
      default: ["MUMBAI"],
      validate: {
        validator: async function(values) {
          if(!values || values.length==0) return false;
          if (values.includes("ALL")) return true;
          for (const value of values){
            const region=await RegionMaster.find({name:value.toString().toUpperCase()})
            if(!region) return false;
          }
          return true;
        },
        message: props => `Region '${props.value}' does not exist in RegionMaster.`
      }
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetCodeVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.getSignedToken = function () {
  return jwt.sign(
    {
      id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      region: this.region,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Helper methods for role-based permissions
userSchema.methods.canAccessState = function (state) {
  const statePermissions = {
    Site_Officer: ["site_officer", "admin"],
    Site_PIMO: ["site_pimo", "admin"],
    QS_Site: ["qs_site", "admin"],
    PIMO_Mumbai: ["pimo_mumbai", "admin"],
    Directors: ["director", "admin"],
    Accounts: ["accounts", "admin"],
    Completed: ["admin", "viewer", "accounts"],
    Rejected: ["admin", "site_officer"],
  };

  return statePermissions[state]?.includes(this.role) || false;
};

userSchema.methods.canAdvanceFrom = function (state) {
  const advancePermissions = {
    site_officer: ["Site_Officer"],
    site_pimo: ["Site_PIMO"],
    qs_site: ["QS_Site"],
    pimo_mumbai: ["PIMO_Mumbai"],
    director: ["Directors"],
    accounts: ["Accounts"],
    admin: [
      "Site_Officer",
      "Site_PIMO",
      "QS_Site",
      "PIMO_Mumbai",
      "Directors",
      "Accounts",
    ],
  };

  return advancePermissions[this.role]?.includes(state) || false;
};

userSchema.methods.canRevertFrom = function (state) {
  const revertPermissions = {
    site_officer: [],
    site_pimo: ["QS_Site"],
    qs_site: ["PIMO_Mumbai"],
    pimo_mumbai: ["Directors"],
    director: ["Accounts"],
    accounts: ["Completed"],
    admin: [
      "Site_PIMO",
      "QS_Site",
      "PIMO_Mumbai",
      "Directors",
      "Accounts",
      "Completed",
    ],
  };

  return revertPermissions[this.role]?.includes(state) || false;
};

// Method to record login timestamp
userSchema.methods.updateLoginTimestamp = async function () {
  this.lastLogin = new Date();
  await this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
