import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {"type": String, required: true, trim: true, minlength: 2, maxlength: 50},
    email: {"type": String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/},
    password: {"type": String, required: true, minlength:8, select: false},
    role: { type: String, enum: ["admin", "supervisor", "manager"], default: "manager" },
    createdAt: {"type": Date, default: Date.now}
});

export default mongoose.model("User", userSchema);

