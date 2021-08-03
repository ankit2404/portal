const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
cloudinary.config({
  cloud_name: process.env.Cloudinary_Cloud_Name,
  api_key: process.env.Cloudinary_Key,
  api_secret: process.env.Cloudinary_Secret,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "CeoitboxUserImages",
    allowedFormats: ["jpeg", "png", "jpg"],
  },
});
module.exports = {
  cloudinary,
  storage,
};