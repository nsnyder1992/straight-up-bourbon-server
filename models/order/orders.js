module.exports = (sequelize, DataTypes) => {
  const Orders = sequelize.define("order", {
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trackingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    weight: {
      type: DataTypes.STRING,
    },
    carrierCode: {
      type: DataTypes.STRING,
    },
    carrierService: {
      type: DataTypes.STRING,
    },
    trackingNumber: {
      type: DataTypes.STRING,
    },
    shipmentId: {
      type: DataTypes.STRING,
    },
    trackingUrl: {
      type: DataTypes.STRING,
    },
  });

  return Orders;
};
