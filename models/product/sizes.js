module.exports = (sequelize, DataTypes) => {
  const Sizes = sequelize.define("sizes", {
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Sizes;
};
