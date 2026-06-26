import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  namespace: {
    type: String,
    default: "my_app"
  },
  key: {
    type: String,
    default: "announcement"
  },
  syncedToShopify: {
    type: Boolean,
    default: false
  },
  shopifyMetafieldId: {
    type: String
  }
}, {
  timestamps: true
});

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
