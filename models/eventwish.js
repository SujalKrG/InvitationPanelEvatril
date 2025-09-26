"use strict";

export default (sequelize, DataTypes) => {
  const EventWishes = sequelize.define(
    "EventWishes",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      event_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      guest_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "event_wishes",
      timestamps: true,
      underscored: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  EventWishes.associate = (models) => {
    if (models.Event) {
      EventWishes.belongsTo(models.Event, {
        foreignKey: "event_id",
        as: "event",
      });
    }

    if (models.GuestDirectories) {
      EventWishes.belongsTo(models.GuestDirectories, {
        foreignKey: "guest_id",
        as: "guest",
      });
    }

    if (models.EventConversations) {
      EventWishes.hasMany(models.EventConversations, {
        foreignKey: "event_wish_id",
        as: "conversations",
      });
    }
  };

  return EventWishes;
};
