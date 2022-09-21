module.exports = (sequelize, DataTypes) => {
  const RateRule = sequelize.define("rate-rule", {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    variable: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    function: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return RateRule;
};
