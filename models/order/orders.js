module.exports = (sequelize, DataTypes) => {
  const Orders = sequelize.define("order", {
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isFulfilled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isShipped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isCanceled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    trackingNumber: {
      type: DataTypes.STRING,
    },
    shipmentId: {
      type: DataTypes.STRING,
    },
  });

  return Orders;
};
