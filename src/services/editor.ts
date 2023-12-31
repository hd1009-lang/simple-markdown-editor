export const uploadFile = (data: FormData) => {
  // To Cloudinary
  const res = fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUD_NAME}/image/upload`,
    {
      method: "post",
      body: data,
    }
  ).then(res => {
    if(res.status !== 200) {
      throw new Error("Error")
    }
    return res.json()
  })
  return res;
};
