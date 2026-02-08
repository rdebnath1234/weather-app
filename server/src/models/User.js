import mongoose from "mongoose";

const CitySchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    lastSearchedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    favorites: [CitySchema],
    history: [CitySchema],
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
