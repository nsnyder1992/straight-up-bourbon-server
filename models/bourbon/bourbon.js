module.exports = (sequelize, DataTypes) => {
  const Bourbon = sequelize.define("bourbon", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aroma: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taste: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
    },
    distillery: {
      type: DataTypes.STRING,
    },
    year: {
      type: DataTypes.STRING,
    },
    selection: {
      type: DataTypes.STRING,
    },
  });

  return Bourbon;
};
