module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define("rate", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    carrierCode: {
      type: DataTypes.STRING,
    },
    carrierService: {
      type: DataTypes.STRING,
    },
    minDays: {
      type: DataTypes.STRING,
    },
    maxDays: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
  });

  return Rate;
};
