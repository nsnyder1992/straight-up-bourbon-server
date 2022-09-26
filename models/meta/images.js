module.exports = (sequelize, DataTypes) => {
  const Image = sequelize.define("image", {
    name: {
      type: DataTypes.STRING,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Image;
};
