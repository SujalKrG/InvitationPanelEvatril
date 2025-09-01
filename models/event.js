// models/event.js
export default (sequelize, DataTypes) => {
  const Event = sequelize.define(
    "Event",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      occasion_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      event_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      venue_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      venue_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      occasion_data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "events",
      timestamps: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscored: true,
    }
  );

  // ✅ Associations
  //   Event.associate = (models) => {
  //     Event.belongsTo(models.User, {
  //       foreignKey: "user_id",
  //       as: "user",
  //     });

  //     Event.belongsTo(models.Occasion, {
  //       foreignKey: "occasion_id",
  //       as: "occasion",
  //     });
  //   };

  return Event;
};
